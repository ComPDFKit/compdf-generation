import { createApp } from 'vue'

import App from '@/App.vue'
import { i18n } from '@/locales'
import router from '@/router'
import 'tdesign-vue-next/es/style/index.css';

import '@/styles/index.less'

createApp(App).use(i18n).use(router).mount('#app')
