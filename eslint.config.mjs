import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['node_modules/**','.browser-check/**','dist/**','dist-extension/**','dist-server/**','legacy/**']},...tseslint.configs.recommended,{
 files:['**/*.{ts,mjs}'],languageOptions:{globals:{console:'readonly',process:'readonly',URL:'readonly',setTimeout:'readonly'}},
 rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}
});
