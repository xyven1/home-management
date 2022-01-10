<template>
  <v-container class="text-center d-block">
    <v-progress-circular class="float-middle" :size="70" :width="7" v-if="!switches" indeterminate />
    <template v-for="(sw, index) in switches?.sort((a,b) => a.name.localeCompare(b.name))" :key="index" >
      <v-btn @click="toggle(sw)" class="ma-1" :color="({0: 'secondary', 1:'tertiary',  2: 'info', 'Error': 'error'})[sw.state]">
        {{sw.name}}
      </v-btn>
    </template>
  </v-container>
</template>
<script>
import { toggle } from '../utils/switch.js'
export default {
  data () {
    return {
      switches: [],
    }
  },
  mounted(){
    var vm = this
    vm.$socket.emit("getSwitches", res => vm.switches = res)
    vm.$socket.on('stateChange', (data)=>{
      var sw = vm.switches.find(s=> s.serialNumber == data.serialNumber)
      if(sw) sw.state = data.state
    })
  },
  methods: {
    toggle,
  },
}
</script>