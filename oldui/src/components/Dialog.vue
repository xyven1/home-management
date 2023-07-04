<template>
  <v-dialog v-model="dialog" persistent @keydown.esc="cancel" @keydown.enter="agree">
    <v-card :max-width="maxWidth">
      <v-card-title class="justify-center text-center">{{title}}</v-card-title>
      <v-card-text v-if="message">
          {{message}}
      </v-card-text>
      <slot name="body" v-else></slot>
      <v-card-actions class="justify-center">
        <v-btn color="error" variant="text" large @click="cancel">{{cancelText}}</v-btn>
        <v-btn color="success" variant="text" large @click="agree">{{agreeText}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    name: "ConfirmDlg",
    data() {
      return {
        dialog: false,
        resolve: null,
      }
    },
    emits: ['agree', 'cancel'],
    props: {
      title: String,
      message: String,
      cancelText: {
        type: String,
        default: "Cancel",
      },
      agreeText: {
        type: String,
        default: "OK",
      },
      maxWidth: {
        type: Number,
        default: 300,
      },
      agreeCondition: {
        type: Boolean,
        default: true,
      },
      onShow: {
        type: Function,
        default: () => {},
      },
    },
    methods: {
      show() {
        var vm = this
        vm.dialog = true
        vm.onShow()
        return new Promise(res => vm.resolve = res);
      },
      agree() {
        if(this.agreeCondition === false) return
        this.resolve(true)
        this.$emit("agree")
        this.dialog = false
      },
      cancel() {
        this.resolve(false)
        this.$emit("cancel")
        this.dialog = false
      },
    }
  };
</script>