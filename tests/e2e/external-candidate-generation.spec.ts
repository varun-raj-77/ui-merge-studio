import { expect, test } from '@playwright/test';

const candidateBranch='combined-result';
const card=(page:import('@playwright/test').Page,side:'left'|'right')=>page.locator(`[data-preview-id="${side}"]`);

test.afterEach(async({request})=>{await request.delete('/api/preview').catch(()=>undefined);});

test('selects RevenuePulseBadge from rendered UI and creates the deterministic external candidate',async({page,request})=>{
  test.setTimeout(600_000);
  await page.goto('/?mode=local');
  const repositoryResponse = await request.get('/api/repository');
  expect(repositoryResponse.ok()).toBe(true);
  const repository = await repositoryResponse.json() as {
    foundation: { branchRef: string; commitSha: string };
    branches: string[];
    clean: boolean;
  };
  expect(repository.clean).toBe(true);
  expect(repository.foundation).toMatchObject({
    branchRef: 'main', commitSha: '8223897259151c450f954e462c57df3703d5508d'
  });
  expect(repository.branches.filter(branch => branch !== repository.foundation.branchRef))
    .toEqual(expect.arrayContaining(['prompt020-baseline', 'prompt020-revenue-pulse']));
  await expect(page.getByRole('button',{name:/Continue to comparison/i})).toBeEnabled();
  await page.getByRole('button',{name:/Continue to comparison/i}).click();
  await expect(card(page,'left')).toContainText('prompt020-baseline',{timeout:180_000});
  await expect(card(page,'right')).toContainText('prompt020-revenue-pulse',{timeout:180_000});
  const rightFrame=page.frameLocator('[data-preview-id="right"] iframe');
  await rightFrame.getByRole('button',{name:'Login as Demo User'}).click();
  await expect(rightFrame.getByLabel('Revenue pulse')).toBeVisible({timeout:30_000});
  await page.getByRole('button',{name:'Select parts'}).click();
  const preflightResponsePromise=page.waitForResponse(response=>response.url().endsWith('/api/candidate/preflight')&&response.request().method()==='POST');
  const analysisResponse=page.waitForResponse(response=>response.url().endsWith('/api/previews/right/analysis')&&response.request().method()==='POST');
  await rightFrame.getByLabel('Revenue pulse').click();
  const analyzed=await analysisResponse.then(async response=>({request:response.request().postDataJSON(),value:await response.json()}));
  expect(analyzed.request).toEqual({selectionReceipt:expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/)});
  expect(analyzed.value.artifact.slice.selection).toMatchObject({componentName:'RevenuePulseBadge',branch:'prompt020-revenue-pulse',previewId:'right',confidence:'exact'});
  expect(new Set(analyzed.value.artifact.slice.includedChanges.map((item:{path:string})=>item.path))).toEqual(new Set([
    'src/views/dashboard/RevenuePulseBadge.tsx','src/views/dashboard/index.tsx','src/views/dashboard/revenue-pulse.svg','src/views/dashboard/revenuePulseConfig.ts','src/views/dashboard/useRevenuePulse.ts'
  ]));
  expect(analyzed.value.artifact.slice.excludedChanges).toContainEqual(expect.objectContaining({path:'src/components/layout/index.tsx'}));
  const preflightResponse=await preflightResponsePromise;
  const preflight=await preflightResponse.json();
  expect(preflight.plan.status,JSON.stringify(preflight.plan,null,2)).toBe('ready');
  expect(preflight.plan.repository.generationProfile).toBe('external-react-vite');
  expect(preflight.plan.sliceIds).toHaveLength(1);
  // While the selected source preview is still current, the canonical
  // server-owned plan is valid for a first generation and exact replay.
  // Clicking the UI's combine action replaces that source with the candidate
  // preview; replaying the *old* selection after that is correctly forbidden.
  const generationRequest=(await preflightResponse.request().postDataJSON()) as unknown;
  const initialResponse=await request.post('/api/candidate/generate',{data:generationRequest,timeout:300_000});
  expect(initialResponse.ok(),await initialResponse.text()).toBe(true);
  const first=await initialResponse.json();
  expect(first.status,first.message).toBe('succeeded');
  expect(first.repository).toMatchObject({candidateBranch,idempotent:false});
  expect(first.verification.map((item:{name:string,status:string})=>[item.name,item.status]))
    .toEqual([['install','passed'],['typecheck','passed'],['production-build','passed']]);

  const replayResponse=await request.post('/api/candidate/generate',{data:generationRequest,timeout:300_000});
  expect(replayResponse.ok(),await replayResponse.text()).toBe(true);
  const replay=await replayResponse.json();
  expect(replay).toMatchObject({
    status:'succeeded',
    repository:{
      idempotent:true,
      candidateCommit:first.repository.candidateCommit,
      candidateTree:first.repository.candidateTree
    }
  });

  // The visible combine action must use the same evidence, recognize the
  // equivalent branch, and launch the real candidate preview.
  const uiGeneration=page.waitForResponse(response=>response.url().endsWith('/api/candidate/generate')&&response.request().method()==='POST',{timeout:300_000});
  await page.getByRole('button',{name:'Create combined branch'}).click();
  const displayed=await uiGeneration.then(response=>response.json());
  expect(displayed).toMatchObject({
    status:'succeeded',
    repository:{
      idempotent:true,
      candidateCommit:first.repository.candidateCommit,
      candidateTree:first.repository.candidateTree
    }
  });
  await expect(card(page,'right')).toContainText(candidateBranch,{timeout:180_000});
  const candidateFrame=page.frameLocator('[data-preview-id="right"] iframe');
  await candidateFrame.getByRole('button',{name:'Login as Demo User'}).click();
  await expect(candidateFrame.getByLabel('Revenue pulse')).toBeVisible({timeout:30_000});
  await expect(candidateFrame.getByText(/revenue experiment footer/)).toHaveCount(0);
});
