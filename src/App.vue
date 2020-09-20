<template>
  <h1>
    {{ count }}
  </h1>
  <button @click="add">add</button>
</template>
<script>
export default {
  data() {
    return {
      count: 1,
    };
  },
  methods: {
    add() {
      this.count++;
    },
  },
};
</script>
