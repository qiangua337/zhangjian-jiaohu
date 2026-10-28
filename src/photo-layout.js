export function photoLayout(width,height,maxEdge=768){
  if(!(width>0&&height>0))throw new Error('照片尺寸无效');
  const aspect=Math.min(1.8,Math.max(.6,width/height));
  const canvasWidth=Math.round(aspect>=1?maxEdge:maxEdge*aspect),canvasHeight=Math.round(aspect>=1?maxEdge/aspect:maxEdge);
  const scale=Math.min(canvasWidth/width,canvasHeight/height),drawWidth=width*scale,drawHeight=height*scale;
  const planeWidth=1.02,planeHeight=planeWidth/aspect;
  return{canvasWidth,canvasHeight,drawWidth,drawHeight,drawX:(canvasWidth-drawWidth)/2,drawY:(canvasHeight-drawHeight)/2,planeWidth,planeHeight,frameWidth:1.16,frameHeight:planeHeight+.22};
}

export function fittedPhotoScale({fov,depth,aspect,frameWidth,frameHeight,coverage=.62}){
  const visibleHeight=2*Math.tan(fov*Math.PI/360)*depth;
  return Math.min(visibleHeight*coverage/frameHeight,visibleHeight*aspect*.8/frameWidth);
}
