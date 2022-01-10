<template>
  <v-container class="d-flex justify-center align-content-end align-end flex-wrap" fluid style="height: 100%;">
    <v-btn variant="outlined" size="x-large" icon large class="ma-2"
            v-for="(input, i) in inputs" :key="i" @click="changeInput(input.command)"
            :color="currentInput == input.command ?'primary' :'grey'">
      <v-icon>{{input.icon}}</v-icon>
    </v-btn>
  </v-container>  
</template>
<script>
export default {
  name: 'Audio',
  data(){
    return {
      currentInput: "",
      inputs:[
        {
          name: "Bluetooth",
          icon: "mdi-bluetooth",
          command: "AV3"
        }, {
          name: "Greg Desktop",
          icon: "mdi-desktop-classic",
          command: "AUDIO1"
        }, {
          name: "Spotify",
          icon: "mdi-spotify",
          command: "Spotify"
        },
      ]
    }
  },
  mounted(){
    var vm = this
    vm.$socket.emit('getAudioInput', function(input){
      vm.currentInput = input
    })
  },
  methods: {
    changeInput(input){
      var vm = this;
      vm.$socket.emit('changeInput', input, res=>{
        console.log(res)
      });
    },
    changeVolume(volume){
      var vm = this;
      vm.$socket.emit('changeVolume', volume, res=>{
        console.log(res)
      });
    },
  }
}
</script>