import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
const card=(page:Page,id:'left'|'right')=>page.locator(`[data-preview-id="${id}"]`);
async function prepareResolvedSlices(page:Page){
  await page.goto('/');await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByLabel('Fixture branch',{exact:true}).selectOption('branch-sidebar');await page.getByLabel('Fixture branch B',{exact:true}).selectOption('branch-inspector');await page.waitForTimeout(50);await page.getByRole('button',{name:'Launch both previews'}).click();await expect(page.getByRole('status')).toHaveText('Both previews ready',{timeout:90_000});
  const left=page.frameLocator('iframe[title="branch-sidebar preview"]');const right=page.frameLocator('iframe[title="branch-inspector preview"]');
  await right.getByRole('button',{name:/TCK-102/}).click();await expect(right.getByRole('heading',{name:'Payment gateway timeout'})).toBeVisible();
  await card(page,'left').getByRole('button',{name:'Enter selection mode'}).click();await left.getByRole('button',{name:'Collapse sidebar'}).click();await card(page,'right').getByRole('button',{name:'Enter selection mode'}).click();await right.getByRole('button',{name:'note'}).click();
  await card(page,'left').getByRole('button',{name:'Analyze feature slice'}).click();await expect(card(page,'left').getByRole('heading',{name:/Feature slice.*resolved/})).toBeVisible({timeout:60_000});await card(page,'right').getByRole('button',{name:'Analyze feature slice'}).click();await expect(card(page,'right').getByRole('heading',{name:/Feature slice.*resolved/})).toBeVisible({timeout:60_000});
}

test('generates, verifies, repeats, launches, and invalidates the real two-slice candidate',async({page})=>{
  test.setTimeout(600_000);
  await prepareResolvedSlices(page);const panel=page.locator('.candidate');await expect(panel).toContainText('Selected resolved slices:');await expect(panel).toContainText('combined-result');
  await panel.getByRole('button',{name:'Prepare candidate plan'}).click();await expect(panel.getByRole('heading',{name:'Preflight: ready'})).toBeVisible({timeout:90_000});await expect(panel).toContainText(/operations across \d+ files/);
  await panel.getByRole('button',{name:'Generate candidate'}).click();await expect(panel).toContainText('Validate → plan → transform → verify → commit');await expect(panel.getByRole('heading',{name:'Generation succeeded'})).toBeVisible({timeout:240_000});
  for(const gate of ['install','typecheck','tests','focused-feature-tests','production-build'])await expect(panel).toContainText(`${gate}: passed`);await expect(panel).toContainText('src/features/navigation/AppSidebar.tsx');await expect(panel).toContainText('src/features/tickets/ActivityFilters.tsx');await expect(panel.getByRole('link',{name:'Download candidate report'})).toHaveAttribute('href',/\/api\/candidate\/reports\//);
  const firstCommit=(await panel.locator('code').allTextContents()).find(value=>/^[0-9a-f]{40}$/.test(value));expect(firstCommit).toBeTruthy();
  await panel.getByRole('button',{name:'Generate candidate'}).click();await expect(panel).toContainText('Candidate generation in progress.');await expect(panel.getByRole('heading',{name:'Generation succeeded'})).toBeVisible({timeout:240_000});await expect(panel).toContainText('idempotent');expect((await panel.locator('code').allTextContents()).find(value=>/^[0-9a-f]{40}$/.test(value))).toBe(firstCommit);
  await panel.getByRole('button',{name:'Launch candidate'}).click();const candidate=page.frameLocator('iframe[title="combined-result preview"]');await expect(candidate.getByRole('button',{name:'Collapse sidebar'})).toBeVisible({timeout:90_000});await expect(candidate.getByRole('heading',{name:'Support Tickets'})).toBeVisible();await expect(candidate.getByRole('heading',{name:'Operations'})).toHaveCount(0);
  const ticketLabels=await candidate.getByRole('region',{name:'Tickets'}).getByRole('button').allTextContents();expect(ticketLabels.map(value=>value.match(/TCK-\d+/)?.[0])).toEqual(['TCK-102','TCK-103','TCK-104']);
  await candidate.getByRole('button',{name:/TCK-102/}).click();await expect(candidate.getByRole('heading',{name:'Payment gateway timeout'})).toBeVisible();await candidate.getByRole('button',{name:'status'}).click();await expect(candidate.getByText('No status activity found.')).toBeVisible();
  await card(page,'right').getByRole('button',{name:'Start / restart preview B',exact:true}).click();await expect(panel).toContainText('Generation blocked:');await expect(panel).not.toContainText('Generation succeeded',{timeout:90_000});await expect(panel.getByRole('button',{name:'Generate candidate'})).toBeDisabled();await expect(page.getByRole('status')).toHaveText('Both previews ready',{timeout:90_000});
});

test('shows a controlled unsafe source-integration conflict and never enables generation',async({page})=>{
  test.setTimeout(180_000);
  await prepareResolvedSlices(page);await page.route('**/api/candidate/preflight',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({generationId:'controlled-conflict',plan:{version:1,repository:{baseCommit:'2337f31',candidateBranch:'combined-result'},sliceIds:['slice-left','slice-right'],operations:[],conflicts:[{id:'conflict:controlled',kind:'overlapping-declaration',path:'src/Shared.tsx',symbol:'SharedView',sliceIds:['slice-left','slice-right'],operationIds:['op:left','op:right'],evidenceEdgeIds:['edge:left','edge:right'],reason:'Slices reconstruct src/Shared.tsx#SharedView with different source declarations.',manualResolution:'Resolve the competing source ownership manually, then produce fresh resolved slices.'}],unresolved:[],status:'refused'}})}));
  const panel=page.locator('.candidate');await panel.getByRole('button',{name:'Prepare candidate plan'}).click();await expect(panel.getByRole('heading',{name:'Preflight: refused'})).toBeVisible();await expect(panel).toContainText('src/Shared.tsx#SharedView');await expect(panel).toContainText('different source declarations');await expect(panel.getByRole('button',{name:'Generate candidate'})).toBeDisabled();await expect(panel.getByRole('button',{name:'Launch candidate'})).toHaveCount(0);
});
