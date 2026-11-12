// Scene shortcuts must never replace a focused control's native keyboard action.
export function shouldHandleSceneSpace(event,{activeElement,canvas,blocked=false}={}){
  if(blocked||event.code!=='Space'||event.defaultPrevented||event.repeat||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return false;
  if(!activeElement||activeElement.isContentEditable)return false;
  return Boolean(canvas&&activeElement===canvas)||['BODY','HTML'].includes(activeElement.tagName);
}
