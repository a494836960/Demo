import EXIF from 'exif-js';
// yarn add exif-js
/* iview 文件上传
  private onUploadbefore(file: any) {
    const uploadRef: any = this.$refs.upload;
    uploadRef.fileList = [];
    let fileName = file.name;
    this.commonService.fixImageRotate(file).then((res: any) => {
      if (res) {
        uploadRef.post(new File([res], fileName, {type: file.type}));
      } else {
        uploadRef.post(file);
      }
    });
    return false;
  }

*/
  // 通过EXIF校正图片   file: File
  public fixImageRotate(file:any){
    let deg = {
      normal: 1,
      reversal: 3, // 180 度
      clockwise: 6, // 顺时针
      anticlockwise:8, // 逆时针
    }
    return new Promise((resolve:any, reject:any)=>{
      let fr: any = new FileReader();
    fr.readAsArrayBuffer(file);
    fr.onload = ()=> {
      let info = EXIF.readFromBinaryFile(fr.result);
      if (info && info.Orientation !== deg.normal) {
        //有图片信息，并且图片有旋转
        let image = new Image();
        let blob:any = new Blob([fr.result]);
        image.src = window.URL.createObjectURL(blob);
        image.onload = ()=> {
          // 判断旋转的角度是 90 还是 180， 如果是90 度需要交换宽高
          let width = info.Orientation === deg.reversal ? image.width : image.height;
          let height = info.Orientation === deg.reversal ? image.height : image.width;
          let canvas = document.createElement('canvas');
          let ctx: any = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;
          ctx.fillRect(0, 0, width, height)
          this.rotateImg(ctx,image,info.Orientation,width,height);
          canvas.toBlob((e)=>{
            resolve(e);
          },file.type, 0.8);
        };
      } else {
        return resolve(false);
      }
    };
    })
  }
  
  // 旋转图片
  private rotateImg (ctx:any, img:any, orientation:any, width:any, height:any) {
    switch (orientation) {
        case 3:
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 6:
           ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -height, 0, height, width);
          
            break;
        case 8:
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 2:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, width, height);
            break;
        case 4:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 5:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 7:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -height, 0, height, width);
            break;
        default:
            ctx.drawImage(img, 0, 0, width, height);
    }
}
