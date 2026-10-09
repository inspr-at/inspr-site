// SPDX-License-Identifier: AGPL-3.0-only
// Required local file: INSPR_CAPTURE_DENYLIST or ~/.inspr/capture-denylist.json.
// Format: names, hostPatterns, domains, companies arrays of strings or objects.
// Literal objects use {value, replacement?}; hostPatterns use {pattern, replacement?}.
// It stays on the operator machine outside every repo and must never be committed.
// Fixtures only: never production data, a fleet host, browser chrome or an instance URL.
// Run natively outside the Codex sandbox (NIX-445); obtain Opus visual QA before publishing.
// This AGPL-3.0-only spec imports AGPL test fixtures from the PAIMOS checkout at run time.
import { test, expect, type Page, type Route, type Locator } from '@playwright/test'
import { loadCaptureDenylist, createCaptureSanitizer, captureTextProblems } from './privacy.mjs'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fixtures, mockWork, me } from '../work-fixtures'
import { settingsData, mockSettings } from '../settings-fixtures'
import { mockEffectivePermissions } from '../authz-fixtures'
import { deliveryMetrics, mockDelivery } from '../delivery-numbers-fixtures'
import { mockFlow, RUN } from '../delivery-flow-fixtures'
import { mockModels } from '../models-simple-fixtures'
import { mockRegistry, registryWorld, mockProfile } from '../models-registry-fixtures'
import { agentData, mockAgents } from '../agents-fixtures'
import { capacityWorld, ACCOUNTS, NOW } from '../capacity-fixtures'
import { businessData, mockBusiness } from '../business-fixtures'
import { policyLadder } from '../policies-fixtures'
import { orderAttentionRows, attentionMoveId, type AttentionItem, type AttentionResult, type AttentionBulkPreview, type AttentionBulkResult } from '../../src/lib/attention'
import type { DeliveryItem, DeliveryPage, DeliveryState } from '../../src/lib/delivery'
import type { ReviewPolicy, ReviewPolicySettings } from '../../src/lib/reviewPolicy'

const row = (index: number, extra: Partial<AttentionItem> = {}): AttentionItem => ({
  event_id: index + 1, node_id: `node-${index}`, revision: '2026-10-04T08:00:00Z', key: `${index % 2 ? 'PHAROS' : 'AEON'}-${index + 10}`,
  title: index === 0 ? 'Die vollständigen Abrechnungseinstellungen für sämtliche angeschlossenen Arbeitsbereiche zuverlässig aktualisieren' : `Ticket ${index + 1}`,
  project_id: index % 2 ? 'p-pharos' : 'p-aeon', kind: index % 2 ? 'cancel' : 'triage',
  from: index % 2 ? 'backlog' : 'new', to: index % 2 ? 'cancelled' : 'backlog',
  reason: 'Untouched in this project; review the current suggestion.', at: '2026-10-03T08:00:00Z', editable: true, applicable: true, ...extra,
})
async function setupAttention(page: Page, items = [row(0), row(1), row(2)], options: { fail?: boolean; partial?: boolean; held?: Promise<void>; received?: () => void; groups?: 'absent'; canManage?: boolean } = {}) {
  await mockWork(page, fixtures())
  await mockBusiness(page, businessData({ role: options.canManage ? 'admin' : 'member' }), { role: options.canManage ? 'admin' : 'member' })
  const preferences = new Map<string, unknown>()
  await page.route('**/api/preferences/needs-attention*', async route => {
    const key = new URL(route.request().url()).pathname
    if (route.request().method() === 'PUT') preferences.set(key, route.request().postDataJSON().value)
    await route.fulfill({ json: { value: preferences.get(key) ?? null } })
  })
  const live = new Map(items.map(item => [item.event_id, { ...item }]))
  const overrides = new Map<string, { mode: 'on' | 'off' | 'inherit'; revision: number }>()
  const actions: { action: string; items: AttentionItem[] }[] = [], queries: URLSearchParams[] = [], paths: string[] = []
  let fail = options.fail ?? false
  let releaseRevision = items.find(item => item.release_id)?.release_revision ?? 0
  let projectRevision = items.find(item => item.release_id)?.release_project_revision ?? 0
  await page.route('**/api/status-autopilot/attention**', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.pathname.endsWith('/actions')) {
      const body = request.postDataJSON() as { action: string; items: AttentionItem[] }; actions.push(body)
      const results: AttentionResult[] = body.items.map(item => {
        if (options.partial && item.event_id === 2) return { event_id: 2, ok: false, error: 'The ticket changed. Reload before trying again.' }
        return { event_id: item.event_id, ok: true, resolution_event_id: body.action === 'undo' ? undefined : item.event_id + 1000, revision: body.action === 'undo' ? '2026-10-05T09:00:00Z' : '2026-10-05T08:00:00Z', ...(item.release_id ? { release_id: item.release_id, previous_release_revision: releaseRevision, release_revision: ++releaseRevision, previous_release_project_revision: projectRevision, release_project_revision: ++projectRevision } : {}) }
      })
      options.received?.(); if (options.held) await options.held
      return route.fulfill({ json: { items: results } }).catch(() => {})
    }
    paths.push(url.pathname)
    queries.push(url.searchParams)
    if (fail) return route.fulfill({ status: 503, json: { error: 'unavailable' } })
    if (options.groups === 'absent' && url.pathname.endsWith('/groups')) return route.fulfill({ status: 404, json: { error: 'not found' } })
    const q = url.searchParams, filtered = [...live.values()].filter(item => (!q.get('kind') || item.kind === q.get('kind')) && (!q.get('project_id') || item.project_id === q.get('project_id')) && (!q.get('q') || item.title.toLowerCase().includes(q.get('q')!.toLowerCase())))
    if (url.pathname.endsWith('/groups')) {
      const by = q.get('by'), ids = [...new Set(filtered.map(item => by === 'kind' ? item.kind : item.project_id))]
      return route.fulfill({ json: { total: filtered.length, truncated: false, groups: ids.map(id => {
        const rows = filtered.filter(item => (by === 'kind' ? item.kind : item.project_id) === id)
        return { id, ...(by === 'kind' ? { kind: id } : { project_id: id, key: id === 'p-aeon' ? 'AEON' : 'PHAROS', title: id === 'p-aeon' ? 'Aeon' : 'Pharos' }), total: rows.length, counts: Object.fromEntries(['proposed', 'triage', 'cancel', 'blocked', 'missed'].map(kind => [kind, rows.filter(row => row.kind === kind).length])), editable: rows.filter(row => row.editable).length, applicable: rows.filter(row => row.applicable && row.editable).length, override_mode: overrides.get(id)?.mode ?? 'on', can_manage: !!options.canManage && rows.some(row => row.editable) }
      }) } })
    }
    const offset = Number(q.get('after') ?? 0)
    return route.fulfill({ json: { items: orderAttentionRows(filtered).slice(offset, offset + 50), total: filtered.length, counts: { proposed: 0, triage: items.filter(i => i.kind === 'triage').length, cancel: items.filter(i => i.kind === 'cancel').length, blocked: 0, missed: 0 }, next_cursor: filtered.length > offset + 50 ? String(offset + 50) : null,
      facets: { projects: [{ id: 'p-aeon', label: 'AEON Aeon' }, { id: 'p-pharos', label: 'PHAROS Pharos' }], assignees: [{ id: 'old-person', label: 'Previous assignee' }] }, facets_truncated: false } })
  })
  return { actions, queries, paths, preferences, live, overrides, recover: () => { fail = false } }
}

const at = '2026-10-07T05:00:00Z', now = '2026-10-07T06:00:00Z'
function deliveryRow(state:DeliveryState, index:number):DeliveryItem {
 return { id:`delivery-${index}`,project_id:'p-pharos',ticket_node_id:'n-1',repository:'example/paimos',pull_request:357+index,branch:'work/aeon-853-delivery-status-and-cross-family-review-settings-with-a-long-german-name',head_sha:'a'.repeat(40),state,state_since:at,owner:state==='held'?'person':state==='pushed'?'ci':state==='in_queue'?'queue':state==='queue_failed'?'builder':state==='merged'?'':'coordinator',deadline_at:state==='held'||state==='built'||state==='merged'?null:index===2?'2026-10-07T05:45:00Z':'2026-10-07T06:30:00Z',held_reason:state==='held'?'Die Freigabe der Lieferdokumentation wird vor dem nächsten Queue-Lauf durch die zuständige Person geprüft.':null,held_from_state:state==='held'?'ci_green':null,required_checks_passed:3,required_checks_total:5,link_source:'title_key',updated_at:at }
}
async function setupTicket(page:Page, theme:'light'|'dark'='light', lang:'en'|'de'='en', manage=true) {
 const work=fixtures();work.preferences.theme={choice:theme};await mockWork(page,work,{admin:true})
 const data=settingsData();data.profile.locale=lang==='de'?'de-AT':'en-GB';await mockSettings(page,data)
 await page.clock.install({ time: new Date(now) })
 await page.route('**/api/me/permissions*',route => {
  const answer=mockEffectivePermissions('admin',new URL(route.request().url()).searchParams.get('project_id')??undefined)
  const grants=['delivery_queue.read','delivery.read','reviewpolicy.read',...(manage?['delivery.manage','reviewpolicy.manage']:[])]
  answer.workspace.permissions.push(...grants);answer.project?.permissions.push(...grants)
  return route.fulfill({json:answer})
 })
 await page.route('**/api/models/routes*',route => route.fulfill({json:policyLadder('review-gate')}))
 await page.route('**/api/settings/work-vocabulary',route => route.fulfill({json:{revision:0,leaf:{name:'',icon:''},levels:[],lead:{singular:'Dirigent',plural:'Dirigenten'}}}))
 const delivery:DeliveryPage={available:true,next_cursor:null,items:['held','queue_failed','pushed','built','reviewed','ci_green','in_queue','merged'].map((state,i) => deliveryRow(state as DeliveryState,i))}
 let failRead=false, failWrite=false, policyRevision=1
 const writes:{path:string;body:unknown;revision:string|undefined}[]=[]
 const workspace:ReviewPolicy={mode:'other_family',allowed_families:[]}, overrides=new Map<string,ReviewPolicy>()
 const answer=(id:string):ReviewPolicySettings => ({project_id:id||null,policy:id?overrides.get(id)??null:{...workspace},effective:id?overrides.get(id)??{...workspace}:{...workspace},workspace:{...workspace},source:id&&overrides.has(id)?'project':'tenant',updated_by:!id||overrides.has(id)?'editor':null,updated_at:!id||overrides.has(id)?`2026-10-07T05:00:${String(policyRevision).padStart(2,'0')}Z`:null,valid_families:['openai','anthropic','xai','cursor','google','local']})
 await page.route('**/api/projects/*/delivery-queue?*',route => route.fulfill({json:{items:[],settings:{mode:'off',freeze:false},next_cursor:null}}))
 await page.route('**/api/nodes/*/delivery*',route => failRead?route.fulfill({status:503,json:{error:'Delivery read failed'}}):route.fulfill({json:delivery}))
 await page.route('**/api/delivery/*/hold',route => {
  writes.push({path:new URL(route.request().url()).pathname,body:null,revision:route.request().headers()['if-unmodified-since']})
  if(failWrite)return route.fulfill({status:412,json:{error:'Delivery changed; reload before lifting the hold'}})
  const item=delivery.items.find(i => route.request().url().includes(i.id))!;Object.assign(item,{state:'ci_green',held_from_state:null,held_reason:null,owner:'coordinator',state_since:now,updated_at:now,deadline_at:'2026-10-07T06:20:00Z'})
  return route.fulfill({json:item})
 })
 await page.route(/\/api\/(settings\/review-policy|projects\/[^/]+\/review-policy)$/,route => {
  const path=new URL(route.request().url()).pathname,id=/projects\/([^/]+)/.exec(path)?.[1]??'',method=route.request().method()
  if(method!=='GET') {
   writes.push({path,body:method==='DELETE'?null:route.request().postDataJSON(),revision:route.request().headers()['if-unmodified-since']})
   if(failWrite)return route.fulfill({status:403,json:{error:'Review policy permission was revoked'}})
   policyRevision++
   if(method==='DELETE')overrides.delete(id)
   else if(id)overrides.set(id,route.request().postDataJSON())
   else Object.assign(workspace,route.request().postDataJSON())
  }
  return route.fulfill({json:answer(id)})
 })
 return {delivery,writes,overrides,setFailRead:(value:boolean) => {failRead=value},setFailWrite:(value:boolean) => {failWrite=value}}
}

const CAP = process.env.AEON_CAPTURE_OUTPUT!
const WEB = process.env.AEON_CAPTURE_WEB!
const tag = process.env.AEON_CAPTURE_TAG!
const commit = process.env.AEON_CAPTURE_COMMIT!
if (!CAP || !WEB || !tag || !/^[a-f0-9]{40}$/.test(commit ?? '')) throw new Error('Use the capture-aeon-demo/run.mjs runner')
const FRAME_NAMES = ['delivery','delivery-compare','ticket-delivery','ticket-delivery-review','models','models-registry','accounts-usage','attention','attention-preview','chat'] as const
function parseCaptureOnly(value: string | undefined): Set<string> {
 if (value === undefined) return new Set(FRAME_NAMES)
 const names = value.split(',').map(name=>name.trim()).filter(Boolean)
 if (!names.length) throw new Error('CAPTURE_ONLY must list at least one frame')
 const unknown = names.filter(name=>!FRAME_NAMES.includes(name as typeof FRAME_NAMES[number]))
 if (unknown.length) throw new Error(`Unknown CAPTURE_ONLY frames: ${unknown.join(', ')}`)
 return new Set(names)
}
const captureOnly = process.env.CAPTURE_ONLY
const requestedFrames = parseCaptureOnly(captureOnly)
const wantsFrame = (name: string) => requestedFrames.has(name)
const frames: any[] = []
const capturedThisRun = new Set<string>()
const retainedFrames = new Set<string>()
let captureRunPassed = false
function initializeFrames() {
 // Reuse existing evidence only on an explicit selective rerun, never by file existence alone.
 if (captureOnly !== undefined && existsSync(`${CAP}/frames.json`)) {
  const previous = JSON.parse(readFileSync(`${CAP}/frames.json`,'utf8'))
  if (!Array.isArray(previous)) throw new Error('frames.json must contain an array')
  for (const frame of previous) {
   const name = FRAME_NAMES.find(name=>frame.file===`out/${name}.png`)
   // Retained evidence requires viewport, scale and digest metadata.
   if (!name || wantsFrame(name) || retainedFrames.has(name) || !frame.viewport || frame.deviceScaleFactor !== 2 || !frame.sha256 || frame.tag !== tag || frame.commit !== commit || !existsSync(`${CAP}/${frame.file}`)) continue
   const digest = execFileSync('shasum',['-a','256',`${CAP}/${frame.file}`],{encoding:'utf8'}).split(/\s+/)[0]
   expect(digest, `${name}: retained PNG must match recorded evidence`).toBe(frame.sha256)
   frame.overrides = {} // Never carry private replacement metadata from older evidence.
   frames.push(frame); retainedFrames.add(name)
  }
 }
 writeFileSync(`${CAP}/frames.json`,JSON.stringify(frames,null,2)+'\n')
}
function assertCaptureSourceSelectors() {
 // Check the release-128 templates, not assumptions about another UI version.
 const checks: [string,string[]][] = []
 if (wantsFrame('attention') || wantsFrame('attention-preview')) checks.push(
  ['components/work/TicketTable.vue',[':id="`row-group-${entry.group.key}`"','class="group-toggle"',':aria-expanded="!collapsed.has(entry.group.key)"',"'Expand' : 'Collapse'"]],
 )
 if (wantsFrame('chat')) checks.push(
  ['components/agents/SessionPanel.vue',['class="session-panel"','aria-label="Session details"','id="session-panel-messages"']],
  ['components/agents/SessionChat.vue',['class="thread-scroll"','class="composer"','class="compose"','<textarea','class="field"','chat-stop',':aria-label="words.stop"']],
  ['components/agents/SessionMessages.vue',['class="msg"',':data-id="m.id"','class="delivery"',':class="statusOf(m)!.status"']],
  ['components/agents/ChatCodeBlock.vue',['class="chat-code"','class="code-head"','class="code-copy"']],
  ['components/agents/sessionChat.ts',["stop: 'Stop'"]],
 )
 for (const [file,tokens] of checks) {
  const source = readFileSync(`${WEB}/src/${file}`,'utf8')
  for (const token of tokens) expect(source, `Release 128 selector contract: ${file}: ${token}`).toContain(token)
 }
}
async function expandAttentionGroup(page: Page, projectId: string, label: string) {
 const group = page.locator(`#row-group-${projectId}`)
 await expect(group).toHaveCount(1)
 await expect(group).toBeVisible()
 const toggle = group.locator('button.group-toggle')
 await expect(toggle).toHaveCount(1)
 await expect(toggle).toBeVisible()
 await expect(toggle).toHaveAttribute('aria-expanded', /^(true|false)$/)
 if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
 await expect(toggle).toHaveAttribute('aria-expanded','true')
 await expect(toggle).toHaveAccessibleName(`Collapse ${label}`)
}
const denylist = loadCaptureDenylist()
async function protect(page: Page) {
 const overrides = new Map<string,string>()
 // Evidence records only neutral labels/replacements, never private source values.
 const sanitize = createCaptureSanitizer(denylist, (kind: string, replacement: string) => overrides.set(kind, replacement))
 // All fixture route handlers retain their own interception and response logic.
 // Only fictional display values are changed, before the Vue application sees them.
 const register = page.route.bind(page)
 await register('http://localhost:5891/**', route=>{
  const path=new URL(route.request().url()).pathname
  if(path.startsWith('/api/')) return route.fulfill({status:501,json:{error:'No fixture'}})
  const file=CAP+'/site'+(path.startsWith('/assets/')?path:'/index.html')
  const ext=file.split('.').pop()!
  return route.fulfill({body:readFileSync(file),contentType:({html:'text/html',js:'text/javascript',css:'text/css',woff2:'font/woff2',svg:'image/svg+xml',png:'image/png'} as any)[ext]??'application/octet-stream'})
 })
 page.route = (async (match: any, handler: any, options: any) => register(match, async (route, request) => {
  const guarded = new Proxy(route, { get(target, key) {
   if (key === 'fulfill') return (response: any) => target.fulfill(response?.json === undefined ? response : {...response, json:sanitize(response.json)})
   const v = Reflect.get(target,key); return typeof v === 'function' ? v.bind(target) : v
  } })
  return handler(guarded,request)
 }, options)) as typeof page.route
 // A request that misses all repository mocks is stopped here. No backend exists.
 await page.route('**/api/**', route => route.fulfill({status:501,json:{error:'No capture fixture for this route'}}))
 return overrides
}
async function base(page: Page, theme: 'light'|'dark' = 'light', time = '2026-10-09T08:00:00Z') {
 const overrides = await protect(page)
 await page.clock.setSystemTime(new Date(time))
 const work = fixtures(); work.preferences.theme={choice:theme}
 await mockWork(page,work,{admin:true})
 const settings=settingsData(); settings.profile.locale='en-GB'; settings.profile.greeting_enabled=false
 await mockSettings(page,settings)
 return {work,overrides}
}
type CaptureBounds = { start?: Locator; end?: Locator; scroll?: boolean; padX?: number }
async function capture(page: Page, name: string, selector: string, used: string[], overrides: Map<string,string>, altEN:string, altDE:string, bounds: CaptureBounds = {}) {
 if (!wantsFrame(name)) return
 const subject = page.locator(selector).first()
 await expect(subject).toBeVisible()
 if (bounds.scroll !== false) await subject.evaluate(el=>el.scrollIntoView({block:'start'}))
 await page.evaluate(()=>document.fonts.ready)
 await page.mouse.move(0,0)
 const box = (await subject.boundingBox())!
 const start = bounds.start ? (await bounds.start.boundingBox())! : box
 expect(start, `${name}: crop start must render`).toBeTruthy()
 const end = bounds.end ? (await bounds.end.boundingBox())! : box
 expect(end, `${name}: crop endpoint must render`).toBeTruthy()
 const viewport = page.viewportSize()!
 const hdr = await page.locator('.app-header').boundingBox()
 const footer = await page.locator('.app-footer').boundingBox()
 const ceiling = Math.min(viewport.height, footer?.y ?? viewport.height)
 // Fail instead of slicing a requested card, row, note or composer mid-line.
 expect(start.y, `${name}: subject must start inside the viewport`).toBeGreaterThanOrEqual(0)
 expect(end.y + end.height, `${name}: complete crop endpoint must fit above the app footer`).toBeLessThanOrEqual(ceiling)
 const padX = bounds.padX ?? 16
 const left = Math.max(0, Math.floor(box.x - padX))
 const top = Math.max(hdr ? hdr.y + hdr.height : 0, Math.floor(start.y - 16))
 const right = Math.min(viewport.width, Math.ceil(box.x + box.width + padX))
 const bottom = Math.min(ceiling, Math.ceil(end.y + end.height + 16))
 const clip = { x:left, y:top, width:right-left, height:bottom-top }
 expect(clip.width).toBeGreaterThan(0); expect(clip.height).toBeGreaterThan(0)
 expect(captureTextProblems(await page.locator('body').innerText(), denylist), `${name}: public-safety check`).toEqual([])
 await expect(page.locator('[data-capture-label]')).toHaveCount(0)
 // The website supplies the HTML caption; screenshots contain only the real UI.
 await page.screenshot({path:`${CAP}/out/${name}.png`,clip,animations:'disabled'})
 capturedThisRun.add(name)
 frames.push({tag,commit,file:`out/${name}.png`,route:new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash,fixtures:used,theme:name.endsWith('-dark')?'dark':'light',viewport,deviceScaleFactor:2,crop:clip,overrides:Object.fromEntries(overrides),altEN,altDE})
 writeFileSync(`${CAP}/frames.json`,JSON.stringify(frames,null,2)+'\n')
}
test('PAIMOS public demo frames',async ({page})=>{
 test.setTimeout(240000)
 assertCaptureSourceSelectors()
 initializeFrames()
 // Isolate each scenario so preferences, route handlers and clocks cannot leak.
 const browser=page.context().browser()!
 await page.close()
 async function screen(names: string[], run:(p:Page)=>Promise<void>){
  if (!names.some(wantsFrame)) return
  const context=await browser.newContext({baseURL:'http://localhost:5891',viewport:{width:1600,height:1000},deviceScaleFactor:2,timezoneId:'Europe/Vienna',colorScheme:'light',reducedMotion:'reduce'})
  context.setDefaultTimeout(10000)
  const p=await context.newPage();try{await run(p)}finally{await context.close()}
 }
 for(const theme of ['light'] as const) await screen(['delivery','delivery-compare'],async p=>{
  await p.setViewportSize({width:1600,height:1200})
  const {overrides}=await base(p,theme,'2026-10-08T18:25:00Z')
  await mockDelivery(p,async()=>({status:200,body:deliveryMetrics()}),['delivery.read'])
  await mockFlow(p)
  await p.goto('/p/AEON/delivery?view=flow')
  await expect(p.getByTestId('flow-chip').locator('.shown')).toHaveText('Live · now 20:25')
  await capture(p,'delivery'+(theme==='dark'?'-dark':''),'.dl',['work-fixtures.ts','settings-fixtures.ts','delivery-flow-fixtures.ts','delivery-numbers-fixtures.ts'],overrides,'PAIMOS Delivery in Live mode, with release and change timelines and the current delivery status.','PAIMOS Delivery im Live-Modus mit Zeitachsen für Release und Änderungen sowie aktuellem Lieferstatus.',{end:p.getByTestId('flow-moment')})
  if(theme==='light') for(const mode of ['compare']){
   if (!wantsFrame('delivery-'+mode)) continue
   await p.goto(`/p/AEON/delivery?view=flow&mode=${mode}&run=${RUN.r126}`)
   await expect(p.getByTestId('flow-pick')).toHaveValue(RUN.r126)
   await p.getByTestId('flow-lanes').focus();await p.keyboard.press('End')
   await capture(p,'delivery-'+mode,'.dl',['work-fixtures.ts','settings-fixtures.ts','delivery-flow-fixtures.ts','delivery-numbers-fixtures.ts'],overrides,`PAIMOS Delivery in ${mode} mode for a recorded demo release.`,`PAIMOS Delivery im ${mode==='replay'?'Replay':'Compare'}-Modus für ein aufgezeichnetes Demo-Release.`,{end:p.getByTestId('flow-moment')})
  }
 })
 await screen(['ticket-delivery','ticket-delivery-review'],async p=>{
  const overrides=await protect(p);const ticketState=await setupTicket(p);ticketState.delivery.items=ticketState.delivery.items.filter(item=>item.state==='pushed')
  await p.goto('/p/PHAROS/PHAROS-11')
  await expect(p.getByRole('region',{name:'Delivery',exact:true}).locator('.delivery-row')).toHaveCount(1)
  await capture(p,'ticket-delivery','section.delivery',['work-fixtures.ts','settings-fixtures.ts','delivery-ui.spec.ts: setup/row','policies-fixtures.ts'],overrides,'Delivery-status card on a PAIMOS ticket, showing its pull request, check progress and deadline.','Lieferstatus eines PAIMOS-Tickets mit Pull Request, Prüffortschritt und Frist.')
  if (!wantsFrame('ticket-delivery-review')) return
  await p.goto('/settings/policies#cross-family-review')
  await expect(p.locator('#cross-family-review').getByRole('radio').first()).toBeEnabled()
  await capture(p,'ticket-delivery-review','#cross-family-review',['work-fixtures.ts','settings-fixtures.ts','delivery-ui.spec.ts: setup','policies-fixtures.ts'],overrides,'PAIMOS cross-family review policy with a reviewer from another model family selected.','PAIMOS-Prüfrichtlinie mit ausgewählter Prüfung durch eine andere Modellfamilie.')
 })
 await screen(['models','models-registry'],async p=>{
  const {overrides}=await base(p)
  await mockModels(p,{member:true,fallback:true})
  const registry = registryWorld()
  registry.profiles.push(...['high','xhigh','max'].map(effort=>mockProfile({harness:'claude',model:'claude-fable-5-1',family:'anthropic',display_name:'Claude Fable',short_name:'Fable',model_version:'5.1',effort})))
  await mockRegistry(p,registry,{permissions:false})
  await p.goto('/settings/models')
  await expect(p.locator('[data-pick="all"]')).toBeVisible()
  await expect(p.locator('[data-row="concept"]')).not.toContainText('fable')
  await expect(p.locator('[data-row="concept"]')).toContainText('Fable 5.1')
  await capture(p,'models','.m-card',['work-fixtures.ts','settings-fixtures.ts','models-simple-fixtures.ts','models-registry-fixtures.ts'],overrides,'PAIMOS Models settings with one default model, task exceptions and independent reviews.','PAIMOS-Modelleinstellungen mit einem Standardmodell, Ausnahmen nach Aufgabe und unabhängigen Prüfungen.')
  if (!wantsFrame('models-registry')) return
  await p.setViewportSize({width:1600,height:1200})
  await expect(p.locator('[data-reg-row="grok-4.7"]')).toBeAttached()
  await capture(p,'models-registry','[data-model-registry]',['work-fixtures.ts','settings-fixtures.ts','models-simple-fixtures.ts','models-registry-fixtures.ts'],overrides,'PAIMOS model registry with model versions, reasoning levels, sources and availability.','PAIMOS-Modellregister mit Versionen, Denkstufen, Quellen und Verfügbarkeit.',{end:p.locator('[data-reg-row="grok-4.7"]')})
 })
 await screen(['accounts-usage'],async p=>{
  const {overrides}=await base(p,'light',new Date(NOW).toISOString())
  await p.setViewportSize({width:1600,height:1200})
  const capacity=capacityWorld({limits:true})
  const mainSignin=capacity.computers[0]!.enrollments.find(e=>e.account_id===ACCOUNTS.main)!
  Object.assign(mainSignin,{verification_state:'completed'})
  Object.assign(capacity.computers[1]!,{computer_name:'acme-build-05',connectivity:'online',last_seen_at:new Date(NOW).toISOString()})
  capacity.computers[1]!.enrollments.push({...mainSignin})
  const data=agentData({me:me.id,now:NOW,projects:{},tickets:{},nodes:{}} as any)
  data.accounts=capacity.accounts as any
  Object.assign(capacity.accounts.find(a=>a.id===ACCOUNTS.main)!,{owner_person_id:me.id,link_revision:3,usage_probe_enabled:true})
  await mockAgents(p,data,{capacity})
  await p.route('**/api/me/permissions*',route=>{const a=mockEffectivePermissions('admin');a.workspace.permissions.push('account.read','account.manage','model_prefs.manage');return route.fulfill({json:a})})
  const policy={account_id:ACCOUNTS.main,posture:'careful',source:'account',floor_percent:10,own_floor_percent:10,revision:1,binding_revision:3,can_set_posture:true,can_set_floor:true}
  await p.route('**/api/agent-accounts/overview*',route=>route.fulfill({json:{accounts:[{account_id:policy.account_id,usage_policy:policy}],has_more:false}}))
  await p.goto('/settings/accounts')
  await p.locator(`.list-row[data-accounts~="${ACCOUNTS.main}"]`).click()
  await expect(p.locator('[data-account-posture="careful"]').first()).toHaveAttribute('aria-pressed','true')
  await p.locator(`.use-sec [data-account="${ACCOUNTS.main}"]`).getByRole('button',{name:/^Details for/}).click()
  await p.locator('section.pane .pane-body').evaluate(el=>{el.scrollTop=0})
  await expect(p.locator('section.pane')).toContainText('Shared by 2 computers')
  await capture(p,'accounts-usage','section.pane',['work-fixtures.ts','settings-fixtures.ts','agents-fixtures.ts','capacity-fixtures.ts','usage-posture.spec.ts: policy state','settings-accounts.spec.ts: owner login state'],overrides,'PAIMOS account usage with a careful-use policy, limits, remaining capacity and reset times.','PAIMOS-Kontonutzung mit vorsichtiger Nutzung, Limits, verbleibender Kapazität und Rücksetzzeiten.',{end:p.locator('section.pane .policy-note').first(),scroll:false,padX:0})
 })
 await screen(['attention','attention-preview'],async p=>{
  const overrides=await protect(p);await p.clock.setSystemTime(new Date('2026-10-07T08:00:00Z'))
  const items=[row(0,{title:'Refresh the workspace billing settings'}),row(1,{title:'Retire the unused demo connector'}),row(2,{title:'Review the release checklist'}),row(3,{title:'Archive the old sample dashboard'}),row(4,{title:'Update the accessibility checks'})]
  await setupAttention(p,items,{canManage:true})
  await p.route('**/api/status-autopilot/attention/bulk**',route=>{
   const body=route.request().postDataJSON()
   expect(body.dry_run).toBe(true)
   const rows=items.filter(r=>r.project_id===body.scope.project_id)
   const moves=new Map<string,any>()
   for(const r of rows){const id=attentionMoveId(r),m=moves.get(id)||{id,kind:r.kind,from:r.from,to:r.to,count:0,sample_keys:[]};m.count++;m.sample_keys.push(r.key);moves.set(id,m)}
   return route.fulfill({json:{total:rows.length,moves:[...moves.values()],skipped:[],through_event_id:5,preview_token:'demo-preview',limit:1000,truncated:false}})
  })
  await p.goto('/tickets?view=needs-attention')
  await expandAttentionGroup(p,'p-aeon','AEON')
  await expandAttentionGroup(p,'p-pharos','PHAROS')
  await expect(p.getByRole('checkbox',{name:'Select PHAROS-11',exact:true})).toBeVisible()
  await expect(p.getByRole('checkbox',{name:'Select PHAROS-13',exact:true})).toBeVisible()
  await expect(p.locator('.list-count')).toHaveText('5 of 5 shown')
  await capture(p,'attention','.attention-page',['work-fixtures.ts','business-fixtures.ts','needs-attention.spec.ts: setup/row'],overrides,'PAIMOS Needs attention grouped by project, with suggested ticket changes and bulk triage.','PAIMOS Needs attention nach Projekt gruppiert, mit vorgeschlagenen Ticketänderungen und Sammelbearbeitung.',{end:p.locator('.list-count')})
  if (!wantsFrame('attention-preview')) return
  const applyAll=p.locator('#row-group-p-aeon').getByRole('button',{name:'Apply all in AEON',exact:true})
  await expect(applyAll).toHaveCount(1)
  await expect(applyAll).toBeEnabled()
  await applyAll.click()
  await expect(p.getByRole('dialog',{name:'Apply all in AEON'})).toBeVisible()
  await capture(p,'attention-preview','[role="dialog"]',['work-fixtures.ts','business-fixtures.ts','needs-attention.spec.ts: setup/row/groupActions preview'],overrides,'PAIMOS bulk-triage preview showing proposed changes before applying them.','PAIMOS-Vorschau der Sammelbearbeitung mit vorgeschlagenen Änderungen vor der Übernahme.',{padX:0})
 })
 for(const theme of ['light'] as const) await screen(['chat'],async p=>{
  await p.setViewportSize({width:1600,height:1200})
  const time=Date.parse('2026-09-29T06:00:00Z'),{overrides}=await base(p,theme,new Date(time).toISOString())
  const data=agentData({now:time,me:me.id,projects:{pharos:'p-pharos',aeon:'p-aeon',pai:'p-frozen'},tickets:{fleet:'n-1',restore:'n-2',web:'n-a1',release:'n-5',approvals:'n-6'},nodes:{}})
  const worker=data.sessions[0]!
  const ownership={daemon_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',generation:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',process_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',root_pid:420,group_id:420,started_at:new Date(time).toISOString()}
  Object.assign(worker,{display_label:'release-lead',run_id:data.runs[0]!.id,process_observed_at:new Date(time).toISOString(),activity:'busy',management_mode:'managed',advertised_capabilities:['managed_control_v1','inbox','steer','interrupt','stop'],process_ownership:ownership})
  Object.assign(data.runs[0]!,{status:'running'})
  data.sessions.splice(1);data.approvals.splice(0)
  const template=data.messages[1]!
  const bodies=['Please run the release checks.','The checks are green. Here is the result:\n\n```sh\nnpm run typecheck\n# No type errors\nnpm run test:unit\n# All checks passed\n```','Keep the accessibility checks in this release.','I am checking keyboard navigation next.','Summarise the final check before handing over.']
  const messages=bodies.map((body,i)=>({...template,id:`demo-message-${i}`,sent_event_id:200+i,body,created_at:new Date(time-(5-i)*60000).toISOString(),...(i%2===0?{sender_principal_id:me.id,recipient_principal_id:worker.agent_principal_id,to:'claude:demo',recipient_session_id:worker.id,sender_session_id:undefined,sender_label:'Ada'}:{sender_principal_id:worker.agent_principal_id,recipient_principal_id:me.id,to:'paimos:ada',sender_session_id:worker.id,sender_label:'release-lead'})}))
  data.messages.splice(0,data.messages.length,...messages as any)
  await mockAgents(p,data)
  await p.route('**/api/inbox/message-status?*',route=>{const ids=new URL(route.request().url()).searchParams.get('ids')!.split(',');return route.fulfill({json:{items:ids.map(id=>({message_id:id,status:id==='demo-message-2'?'read':id==='demo-message-0'?'delivered':'sent',delivered_at:id==='demo-message-4'?null:new Date(time-60000).toISOString(),read_at:id==='demo-message-2'?new Date(time-30000).toISOString():null,deliver_by:new Date(time+240000).toISOString()}))}})})
  const stops:any[]=[]
  await p.route('**/managed-controls',route=>{stops.push(route.request().postDataJSON());return route.fulfill({status:201,json:{id:'demo-interrupt',session_id:worker.id,kind:'interrupt',state:'pending',sequence:1,outcome:null,reason:null,created_at:new Date(time).toISOString(),claimed_at:null,completed_at:null}})})
  await p.goto(`/agents/${worker.id}?tab=messages`)
  const panel=p.getByRole('complementary',{name:'Session details'})
  await expect(panel).toHaveCount(1)
  await expect(panel).toBeVisible()
  // The panel has a fixed desktop width; widen only its capture layout as requested.
  await panel.evaluate(el=>{(el as HTMLElement).style.width='800px';(el as HTMLElement).style.right='24px'})
  await expect(panel).not.toContainText('This session does not take controls from here.')
  const stop=panel.getByRole('button',{name:'Stop',exact:true})
  await expect(stop).toHaveCount(1)
  await expect(stop).toBeEnabled()
  await expect(panel.locator('.chat-code')).toBeVisible()
  await expect(panel.locator('.delivery.read')).toContainText('Read')
  await expect(panel.locator('.delivery.delivered')).toContainText('Delivered')
  const field=panel.locator('.compose textarea.field')
  await expect(field).toHaveCount(1)
  await expect(field).toBeVisible()
  await expect(field).toBeEditable()
  await field.fill('Please include the keyboard check.');await field.blur()
  const thread=panel.locator('.thread-scroll')
  await expect(thread).toHaveCount(1)
  await expect(thread).toBeVisible()
  await thread.evaluate(el=>{el.scrollTop=0})
  await p.mouse.move(0,0)
  await expect(panel.locator('.msg[data-id="demo-message-2"] .delivery.read')).toHaveCSS('opacity','1')
  await expect(panel.locator('.chat-code .code-head')).toBeInViewport({ratio:1})
  await expect(panel.locator('.chat-code .code-head')).toContainText('sh')
  await expect(panel.locator('.chat-code .code-copy')).toContainText('Copy')
  await expect(panel.locator('.composer .compose')).toBeInViewport({ratio:1})
  const conversation=panel.locator('#session-panel-messages')
  await expect(conversation).toHaveCount(1)
  await expect(conversation).toBeVisible()
  await capture(p,'chat','.session-panel',['work-fixtures.ts','settings-fixtures.ts','agents-fixtures.ts','session-chat.spec.ts: conversation/AEON-976 stop','delivery-guarantee.spec.ts: receipt shape'],overrides,'PAIMOS managed-agent chat with a read receipt, a queued message, a code block and Stop control.','PAIMOS-Chat mit verwaltetem Agenten, Lesebestätigung, wartender Nachricht, Codeblock und Stop-Steuerung.',{scroll:false,padX:0,start:conversation})
  await field.focus();await field.press('Escape');await expect(field).not.toBeFocused();expect(stops).toHaveLength(0);await p.keyboard.press('Escape');await expect.poll(()=>stops.length).toBe(1)
  expect(stops[0]).toMatchObject({kind:'interrupt',expected_ownership:ownership})
 })
 expect([...capturedThisRun].sort(), 'Every requested frame must be captured').toEqual([...requestedFrames].sort())
 captureRunPassed = true
})


// Run natively, refresh report.txt with this hook, then obtain Opus visual QA.
test.afterAll(() => {
 const expected = FRAME_NAMES
 frames.sort((a,b)=>expected.findIndex(name=>a.file===`out/${name}.png`)-expected.findIndex(name=>b.file===`out/${name}.png`))
 for (const frame of frames) frame.sha256 = execFileSync('shasum',['-a','256',`${CAP}/${frame.file}`],{encoding:'utf8'}).split(/\s+/)[0]
 writeFileSync(`${CAP}/frames.json`,JSON.stringify(frames,null,2)+'\n')
 const selection = captureOnly === undefined ? '' : `CAPTURE_ONLY=${[...requestedFrames].join(',')} `
 const command = `${selection}node ${JSON.stringify(process.env.AEON_CAPTURE_RUNNER)} ${JSON.stringify(process.env.AEON_CAPTURE_CHECKOUT)} ${JSON.stringify(CAP)}`
 const report = [
  '# PAIMOS demo capture', '',
  `Source: tag ${process.env.AEON_CAPTURE_TAG}, commit ${process.env.AEON_CAPTURE_COMMIT}.`, '',
  `Status: ${captureRunPassed ? 'requested scenes passed fixture, crop and keyboard assertions' : 'incomplete; inspect the native Playwright failure'}. Opus visual QA pending.`,
  `Inventory: ${frames.length}/${expected.length} frames. Requested: ${requestedFrames.size}; captured this run: ${capturedThisRun.size}.`,
  `Retained hash-verified evidence (not rerun): ${[...retainedFrames].join(', ') || 'none'}.`, '',
  'Native rerun command (outside the Codex sandbox; installed Chrome):', command, '',
  'CAPTURE_ONLY selects scenes and retains hash-verified evidence for the rest. Without it every scene is rendered again.',
  'The runner builds the supplied checkout. Playwright intercepts navigation and assets from that build; no listening server is needed.',
  'Fixture text is sanitized before rendering with the required operator-local denylist and generic email/address/domain checks. The body guard rejects remaining private markers. Private source values are omitted from evidence.',
  'Website caption: Real screen, demo data. No image badges, overlays, blur or redaction. Obtain fresh Opus visual QA before publishing.', '',
  '## Per-frame evidence',
 ]
 for (const frame of frames) {
  report.push('', `### ${frame.file}`, '',
   `- Route: ${frame.route}`,
   `- Fixtures: ${frame.fixtures.join(', ')}`,
   `- Theme: ${frame.theme}`,
   `- Viewport: ${frame.viewport.width}×${frame.viewport.height} CSS px; deviceScaleFactor 2`,
   `- Crop: ${JSON.stringify(frame.crop)} (CSS px)`,
   `- SHA-256: ${frame.sha256}`,
   `- Alt EN: ${frame.altEN}`,
   `- Alt DE: ${frame.altDE}`,
   '- Neutral replacement categories (private source values omitted):')
  const pairs = Object.entries(frame.overrides)
  if (!pairs.length) report.push('  - None.')
  for (const [kind, replacement] of pairs) report.push(`  - ${JSON.stringify(kind)} → ${JSON.stringify(replacement)}`)
 }
 const missing = expected.filter(name=>!frames.some(frame=>frame.file===`out/${name}.png`))
 report.push('', `Missing frames: ${missing.join(', ') || 'none'}. Render evidence does not grant visual approval.`, '')
 writeFileSync(`${CAP}/report.txt`,report.join('\n'))
})
