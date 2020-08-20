<!-- 时间刻度尺 -->
<template>
  <div>
    <div :id="`rules${index}`"></div>
    <input :id="`rulerText${index}`" class="text-input" type="text" readonly value="">
  </div>
</template>

<script>
import ruler from '@/common/ruler';
export default {
  props: ['index'],
  data() {
    return {
      drawRuler: '',
      input:'',
      maxScale: 1440,
      startValue: 60 * 7,
    };
  },
  mounted() {
    this.input = document.getElementById("rulerText"+this.index);
    this.drawRuler= ruler.initPlugin({
      el: 'rules'+this.index, //容器id
      maxScale: this.maxScale, //最大刻度
      startValue: this.maxScale-this.startValue, //刻度开始的初始值
      region: [0, this.maxScale], //选择刻度的区间范围
      background: '#000', //刻度尺背景色
      color: '#fff',
      markColor: '#f00', //中心刻度标记颜色
      move:(res)=>{
        res = this.maxScale - res;
        this.input.value = this.fillSpace(Math.floor(res / 60)) +":"+this.fillSpace(res % 60);
      },
      success: (res) => {
        res = this.maxScale - res;
        this.$emit(
          'changeDate',
          this.fillSpace(Math.floor(res / 60)) + ':' + this.fillSpace(res % 60)
        );
      },
    });
  },
  methods: {
    fillSpace(num) {
      let str = num + '';
      if (str.length === 1) {
        str = '0' + str;
      } else if (str.length === 0) {
        str = '00';
      }
      return str;
    },

    // 更新时间刻度 time 1:12
    setRulerTime(time) {
      this.input.value = time;
      let timeArr = time.split(':');
      let count = Number(timeArr[0]) * 60 + Number(timeArr[1]);
      this.drawRuler(this.maxScale - count);
    },
  },
};
</script>
<style>
.ruler-wrap {
  width: 100%;
  /* max-width: 600px; */
  /*height: 60px;*/
  line-height: 1px;
  overflow: hidden;
  margin: 0 auto 50px;
}

.text-input {
  display: block;
  width: 100px;
  height: 30px;
  border-radius: 5px;
  background: #f6f6f6;
  border: none;
  text-align: center;
  font-size: 14px;
  color: #4142cc;
  font-weight: bold;
  letter-spacing: 1px;
  margin: 0 auto;
}
.text-input:focus {
  outline: none;
}
</style>
