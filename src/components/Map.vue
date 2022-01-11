<template>
  <transition @wheel.passive="onScroll" v-touch="{left: () => swipeHandler('left'), right: () => swipeHandler('right')}" class="div-slider" :name="back? 'slideback' : 'slide'">
    <svg viewBox="0 0 295 515" :key="screen">
      <image v-if="svg?.[screen].background" width="295" height="515" x="0" y="0" :xlink:href="getImageUrl(screen)"/> 
      <path v-for="(region, index) in svg?.[screen].regions" :key="index" :d="region.d" @click="selecting ? event.emit('selection', region) : toggle($socket, region.sn, region.sw)"
        style="cursor: pointer; stroke: transparent"
        :style="{
          fill: selecting ? 
            region.sn ? '#FC8C00'
              : 'rgb(var(--v-theme-secondary))'
          :({ 
            0: '#DDDDDD',
            1: 'rgb(var(--v-theme-tertiary))',
            2: 'rgb(var(--v-theme-info))',
            'Error': 'rgb(var(--v-theme-error))'
          })[region.sw?.state] || 'rgb(var(--v-theme-secondary))',
          'stroke-width': region.stroke??0,
        }">
        <title>
          {{region.title}}
        </title>
      </path>
    </svg>
  </transition>
  <div class="overlay">
    <v-row align="center" style="height:100%; margin: 0;">
      <v-col cols="1">
        <v-btn v-show="screen>0  && !mobile" icon class="interactable" @click="prev">
          <v-icon size="x-large" :icon="mdiChevronLeft"/>
        </v-btn>
      </v-col>
      <v-col class="text-center">
      </v-col>
      <v-col cols="1">
        <v-btn v-show="screen<svg?.length-1 && !mobile" @click="next" icon class="interactable float-right">
          <v-icon size="x-large" :icon="mdiChevronRight"/>
        </v-btn>
      </v-col>
    </v-row>
  </div>
  <Dialog ref="addDialog" :agreeCondition="selectedSwitch!=null" :onShow="() => {$socket.emit('getSwitches', res => switchesForAssociation = res)}" agreeText="Continue" title="Choose Switch To Associate" :maxWidth="500" @cancel="selectedSwitch = null" @agree="associateSwitch(selectedSwitch).then(()=> selectedSwitch = null)">
    <template v-slot:body>
      <div class="text-center ma-2">
        <v-btn class="ma-1" :color="selectedSwitch == sw ? 'primary' : ''" variant="outlined" v-for="sw in switchesForAssociation.filter(sw=>!svg.flatMap(screen=>screen.regions).find(screen=>screen.sn == sw.serialNumber))" :key="sw" @click="selectedSwitch = sw">
          {{sw.name}}
        </v-btn>
      </div>
    </template>
  </Dialog>
  <Dialog ref="removeDialog" agreeText="Continue" title="Dissociate Region" message="Select a region to clear" @agree="dissociateSwitch"/>
</template>
<script>
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'
import Dialog from '../components/Dialog.vue'
import { EventEmitter, once } from 'events'
import { toggle } from '../utils/switch.js'
import { useDisplay } from 'vuetify/lib/composables/display'
export default {
  components: {
    Dialog,
  },
  props: {
    screenName: String,
  },
  data(){
    return {
      svg: null,
      selecting: false,
      event: null,
      back: false,
      screen: 1,
      selectedSwitch: null,
      timeOut: null,
      switchesForAssociation: [],
      mdiChevronLeft, mdiChevronRight,
    }
  },
  async mounted(){
    var vm = this
    if(localStorage.screen) vm.screen = parseInt(localStorage.screen)
    else localStorage.screen = vm.screen
    vm.event = new EventEmitter()
    vm.$socket.emit("getSvg", res=>{
      vm.svg = res
      vm.initialize()
    })
    vm.$socket.on('stateChange', (data)=>{
      var sw = vm.svg.flatMap(screen=>screen.regions).map(region=>region.sw).find(s=> s?.serialNumber == data.serialNumber)
      if(sw) sw.state = data.state
    })
  },
  methods:{
    getImageUrl(screen) {
      return new URL(`../assets/${this.svg[screen].background.name}`, import.meta.url).href
    },
    toggle,
    async getSwitch(s){
      var vm = this
      if(s.sn)
        vm.$socket.emit("getSwitch", s.sn, res=>{
          s.sw = res
        })
    },
    onScroll(e){
      var vm = this
      if(!vm.timeOut){
        if(e.deltaY < 0) vm.next()
        else vm.prev()
        vm.timeOut = setTimeout(()=>vm.timeOut = null, 250)
      }
    },
    initialize(){ //associates regions with switches
      console.log("intializing state...")
      var vm = this
      vm.svg.forEach(screen=>{
        screen.regions.forEach(s=>{
          vm.getSwitch(s)
        })
      })
      vm.$emit('update:screenName', vm.svg?.[vm.screen].name)
    },
    associatePrompt(){
      this.$refs.addDialog.show()
    },
    dissociatePrompt(){
      this.$refs.removeDialog.show()
    },
    async associateSwitch(sw){ //alerts client to un associated switches, and prompts a selection
      var vm = this
      vm.selecting = true
      vm.event.on('selection', (region)=>{
        region.sw = sw
        region.sn = sw.serialNumber
        vm.$socket.emit('setSvg', region, res => {
          console.log(res)
          region.sw.state = res.state
        })
      })
      await once(vm.event, 'selection')
      vm.event.removeAllListeners('selection')
      vm.selecting = false
    },
    async dissociateSwitch(){
      var vm = this
      vm.selecting = true
      vm.event.on('selection', (region)=>{
        delete region.sw
        region.sn = ""
        vm.$socket.emit('setSvg', region)
      })
      await once(vm.event, 'selection')
      vm.event.removeAllListeners('selection')
      vm.selecting = false
    },
    swipeHandler(dir){
      var vm = this
      console.log(dir)
      if(dir == 'left') vm.next()
      if(dir == 'right') vm.prev()
    },
    next(){
      this.back = false;
      this.screen += this.screen < this.svg.length-1;
    },
    prev(){
      this.back = true;
      this.screen -= this.screen > 0
    }
  },
  computed: {
    mobile: function () {
      return useDisplay().mobile.value
    }
  },
  watch: {
    screen: function (n){
      localStorage.screen = n;
      this.$emit('update:screenName', this.svg?.[n].name)  
    }
  }
}
</script>
<style>
.slide-enter-active,
.slide-leave-active,
.slideback-enter-active,
.slideback-leave-active {
  transition: .25s;
}

.div-slider{
  position: absolute;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.overlay{
  position: absolute;
  pointer-events: none;
  top:0;
  right:0;
  width: 100%;
  height: 100%;
}
.overlay .interactable{
  cursor: pointer;
  pointer-events:all;
}
.slide-enter-to,
.slideback-enter-to {
  right: 0;
}
.slide-leave-from,
.slideback-leave-from  {
  left: 0;
}
.slide-enter-from {
  right: -100%;
}
.slide-leave-to {
  left: -100%;
}
.slideback-enter-from {
  right: 100%;
}
.slideback-leave-to {
  left: 100%;
}
</style>