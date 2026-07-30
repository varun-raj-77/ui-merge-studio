import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { branches, generated, git } from '../../scripts/fixture-lib';
import { verifyFixture } from '../../scripts/verify-phase0-fixture';

const cleanup:string[]=[];
afterAll(()=>cleanup.forEach(path=>rmSync(path,{recursive:true,force:true})));
function clone(){const path=mkdtempSync(resolve(tmpdir(),'catalogue-fixture-test-'));cleanup.push(path);execFileSync('git',['clone','--quiet','--no-hardlinks',generated,path]);for(const branch of branches.slice(1))git(path,['branch',branch,`origin/${branch}`]);return path;}
function amend(path:string){git(path,['add','-A']);git(path,['-c','user.name=Test','-c','user.email=test@example.invalid','commit','--amend','--no-edit']);}
function expectReject(path:string,message:string){expect(()=>verifyFixture(path)).toThrow(message);}

test('generated fixture has exact Product Catalogue branches, ancestry, and verifies',()=>{expect(git(generated,['rev-list','--count','main..branch-a'])).toBe('1');expect(git(generated,['rev-list','--count','main..branch-b'])).toBe('1');expect(git(generated,['rev-list','--count','main..branch-incompatible'])).toBe('1');expect(()=>verifyFixture(generated)).not.toThrow();});
test('generates deterministic Product Catalogue source and synchronization state on every branch',()=>{for(const branch of branches){expect(git(generated,['show',`${branch}:src/app/App.tsx`])).toContain('Product Catalogue');expect(git(generated,['show',`${branch}:src/state/catalogueContext.ts`])).toContain('product-catalogue-v1');}});
test('rejects a dirty target',()=>{const path=clone();writeFileSync(resolve(path,'dirty.txt'),'dirty');expectReject(path,'clean');});
test('rejects a missing required branch',()=>{const path=clone();git(path,['branch','-D','branch-a']);expectReject(path,'missing branch');});
test('rejects extra feature commits',()=>{const path=clone();git(path,['checkout','branch-a']);writeFileSync(resolve(path,'extra.txt'),'extra');git(path,['add','.']);git(path,['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','Extra']);expectReject(path,'exactly one commit');});
test('rejects a Branch A fixture without the unrelated promotion',()=>{const path=clone();git(path,['checkout','branch-a']);const file=resolve(path,'src/features/catalogue/CatalogueHeader.tsx');writeFileSync(file,readFileSync(file,'utf8').replaceAll('PromotionalBanner','CampaignBanner'));amend(path);expectReject(path,'promotion');});
test('rejects a Branch B fixture without the unrelated inventory change',()=>{const path=clone();git(path,['checkout','branch-b']);rmSync(resolve(path,'src/utils/inventorySummary.ts'));writeFileSync(resolve(path,'src/features/catalogue/CatalogueHeader.tsx'),git(path,['show','main:src/features/catalogue/CatalogueHeader.tsx']));amend(path);expectReject(path,'inventory change');});
test('rejects tags and an unverified combined result',()=>{const path=clone();git(path,['tag','forbidden']);expectReject(path,'tags');git(path,['tag','-d','forbidden']);git(path,['branch','combined-result','branch-a']);expectReject(path,'combined-result');});
