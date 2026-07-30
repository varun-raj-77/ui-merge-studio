import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';

export const demoScenario = {
  productName:'UI Merge Studio',
  sampleAppName:'Product Catalogue',
  promise:'Combine the best UI changes from different React branches.',
  description:'Run branches as real interactive applications, click the visible changes you want, and create one tested combined Git branch.',
  sampleAppDescription:'Controlled React + TypeScript + Vite catalogue with stable product data.',
  task:'Choose the category sidebar from Branch A and the product quick view from Branch B.',
  examples:['Forms','Tables','Charts','Checkout flows','Search','Editors','Modals','Loading states','Validation','Accessibility improvements'],
  branchRelationship:{
    base:{ref:'main',label:'Shared starting branch'},
    experiments:[{ref:'branch-a',label:'Category sidebar branch'},{ref:'branch-b',label:'Quick-view branch'}],
    result:{ref:'combined-result',label:'Verified combined result'}
  },
  versions:{
    left:{eyebrow:'Branch A',branch:'branch-a',branchLabel:'Category sidebar branch',title:'Category sidebar branch',description:'Adds filtering and collapse behavior alongside an unrelated promotion.',selectionPrompt:'Choose the rendered category sidebar.'},
    right:{eyebrow:'Branch B',branch:'branch-b',branchLabel:'Quick-view branch',title:'Quick-view branch',description:'Adds a keyboard-accessible quick view alongside an unrelated inventory summary.',selectionPrompt:'Choose the rendered product quick view.'}
  }
} as const;

export function branchLabel(branch:string){
  if(branch===demoScenario.branchRelationship.base.ref)return demoScenario.branchRelationship.base.label;
  if(branch===demoScenario.branchRelationship.result.ref)return demoScenario.branchRelationship.result.label;
  return demoScenario.branchRelationship.experiments.find(item=>item.ref===branch)?.label??branch.replace(/^branch-/,'').replace(/-/g,' ').replace(/\b\w/g,value=>value.toUpperCase());
}

export function guidedSelectionDecision(_previewId:keyof typeof demoScenario.versions,_artifact:FeatureSliceArtifact):{allowed:true;message:null}|{allowed:false;message:string}{
  return {allowed:true as const,message:null};
}

export function featureLabel(value:SourceIdentity|FeatureSliceArtifact|null|undefined){
  const component=value&&'slice'in value?value.slice.boundary.analyzed:value?.componentName;
  return component?component.replace(/([a-z])([A-Z])/g,'$1 $2'):'No feature selected';
}
