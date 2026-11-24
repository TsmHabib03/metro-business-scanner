import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()],server:{host:'127.0.0.1',port:5173,watch:{ignored:['**/docs/**','**/.impeccable/**','**/database/**','**/.local-data/**','**/.local-tools/**']},proxy:{'/api':'http://127.0.0.1:3001'}},build:{outDir:'dist'}});
