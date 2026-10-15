/* keep focus + caret when a view re-renders while typing */
const _render=render;render=function(){const a=document.activeElement;const id=a&&a.id&&!a.closest('#modal')?a.id:null;let s=null;try{s=a.selectionStart}catch(e){}
 _render();let restored=false;if(id){const n=document.getElementById(id);if(n){n.focus();restored=true;try{if(s!=null)n.setSelectionRange(s,s)}catch(e){}}}
 if(!restored&&S.session&&(UI._af!==UI.view||['pos','returns'].includes(UI.view))){const f=$('#view [autofocus]');if(f)f.focus()}UI._af=UI.view};
load();if(S.session&&!S.users.find(u=>u.id===S.session.userId))S.session=null;render();
