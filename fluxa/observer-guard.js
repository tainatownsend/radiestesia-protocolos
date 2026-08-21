(()=>{
  const NativeObserver=window.MutationObserver;
  if(!NativeObserver||window.__fluxaObserverGuardInstalled)return;
  window.__fluxaObserverGuardInstalled=true;
  class GuardedMutationObserver{
    constructor(callback){
      this.callback=callback;
      this.pending=[];
      this.frame=null;
      this.native=new NativeObserver((mutations)=>{
        this.pending.push(...mutations);
        if(this.frame!==null)return;
        this.frame=requestAnimationFrame(()=>{
          this.frame=null;
          const batch=this.pending.splice(0);
          if(!batch.length)return;
          try{this.callback(batch,this);}catch(error){setTimeout(()=>{throw error;},0);}
        });
      });
    }
    observe(target,options){return this.native.observe(target,options);}
    disconnect(){if(this.frame!==null){cancelAnimationFrame(this.frame);this.frame=null;}this.pending.length=0;return this.native.disconnect();}
    takeRecords(){return [...this.pending.splice(0),...this.native.takeRecords()];}
  }
  window.MutationObserver=GuardedMutationObserver;
})();
