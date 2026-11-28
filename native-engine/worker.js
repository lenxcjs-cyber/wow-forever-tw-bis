"use strict";
// Same-origin engine only. No remote simulator, no character upload.
let ready=false,busy=false,failed=false;
const fail=(e,jobId=null)=>{if(failed)return;failed=true;postMessage({type:"error",jobId,message:String(e?.message||e).slice(0,1200)});};
self.onmessage=e=>{
 if(!ready||busy||failed||e.data?.type!=="run")return;
 busy=true;
 try{
  const input=e.data.request;
  if(typeof input!=="string"||input.length>8000000)throw Error("Request too large");
  const raw=self.raidSimJson(input);
  if(typeof raw!=="string")throw Error("Native engine did not return JSON");
  const result=JSON.parse(raw);
  if(result.error)throw Error(result.error.message||"Native simulation failed");
  postMessage({type:"result",jobId:e.data.jobId??null,result});
 }catch(err){fail(err,e.data.jobId??null);}finally{busy=false;}
};
(async()=>{
 try{
  importScripts("./wasm_exec.js");
  const go=new Go();
  self.wasmready=()=>{ready=true;postMessage({type:"ready"});};
  const res=await fetch("./lib.wasm.gz",{credentials:"same-origin"});
  if(!res.ok)throw Error("Engine file HTTP "+res.status);
  let bytes=await res.arrayBuffer();
  const header=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
  if(header[0]===31&&header[1]===139){
   if(typeof DecompressionStream==="undefined")throw Error("Browser does not support gzip decompression");
   bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  }
  const module=await WebAssembly.instantiate(bytes,go.importObject);
  await go.run(module.instance);
  throw Error("Native engine stopped");
 }catch(e){fail(e);}
})();
