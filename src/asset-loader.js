function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException('已取消加载', 'AbortError');
}

export async function downloadBinary(url, {signal, expectedBytes, onProgress=()=>{}, fetcher=fetch}={}) {
  checkAbort(signal);
  const response=await fetcher(url,{signal,cache:'force-cache'});
  if(signal?.aborted){await response.body?.cancel();checkAbort(signal);}
  if(!response.ok)throw new Error('识别资源下载失败：'+response.status);
  const reported=Number(response.headers.get('content-length'));
  const total=expectedBytes>0?expectedBytes:reported>0?reported:null;
  let loaded=0;
  const report=done=>onProgress({loaded,total,ratio:done?1:total?Math.min(.99,loaded/total):null,done});
  report(false);
  if(!response.body?.getReader){const buffer=new Uint8Array(await response.arrayBuffer());checkAbort(signal);loaded=buffer.length;report(true);return buffer;}
  const reader=response.body.getReader(),chunks=[];
  const cancel=()=>{reader.cancel().catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  try {
    while(true){checkAbort(signal);const {done,value}=await reader.read();checkAbort(signal);if(done)break;chunks.push(value);loaded+=value.byteLength;report(false);}
    const buffer=new Uint8Array(loaded);let offset=0;
    for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
    report(true);return buffer;
  } finally {signal?.removeEventListener('abort',cancel);reader.releaseLock();}
}
