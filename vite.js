const fs = require("fs");
const path = require("path");
const Koa = require("koa");
// const router = require('koa-router')();
const compilerSfc = require("@vue/compiler-sfc");
const compilerDom = require("@vue/compiler-dom");

// egg基于Koa，
const app = new Koa();
// app.use(router.routes());

// router.get("/", ({request: { url, query }}) => {
//   let content = fs.readFileSync("./index.html", "utf-8");
//   content = content.replace(
//     "<script",
//     `
//     <script>
//       // 注入一个socket客户端
//       // 后端的文件变了，通知前端去更新
//       window.process = {
//         env: {NODE_EV:'dev'}
//       }
//     </script>
//     <script
//   `
//   );
//   ctx.type = "text/html";
//   ctx.body = content;
// })
// router.get("/")

app.use((ctx) => {
  const {
    request: { url, query },
  } = ctx;

  // 首页
  if (url === "/") {
    let content = fs.readFileSync("./index.html", "utf-8");
    content = content.replace(
      "<script",
      `
      <script>
        // 注入一个socket客户端
        // 后端的文件变了，通知前端去更新
        window.process = {
          env: {NODE_EV:'dev'}
        }
      </script>
      <script
    `
    );
    ctx.type = "text/html";
    ctx.body = content;
  } else if (url.endsWith(".js")) {
    // js文件
    const p = path.resolve(__dirname, url.slice(1));
    ctx.type = "application/javascript";
    const content = fs.readFileSync(p, "utf-8");
    ctx.body = rewriteImport(content);
  } else if (url.startsWith("/@modules/")) {
    // node_modules文件解析
    const prefix = path.resolve(
      __dirname,
      "node_modules",
      url.replace("/@modules/", "")
    );
    const module = require(prefix + "/package.json").module;
    const p = path.resolve(prefix, module);
    const ret = fs.readFileSync(p, "utf-8");
    ctx.type = "application/javascript";
    ctx.body = rewriteImport(ret);
  } else if (url.indexOf(".vue") > -1) {
    // vue单文件组件
    const p = path.resolve(__dirname, url.split("?")[0].slice(1));
    // 解析单文件组件，需要vue官方的库
    const { descriptor } = compilerSfc.parse(fs.readFileSync(p, "utf-8"));
    // 普通js内容
    if (!query.type) {
      ctx.type = "application/javascript";
      ctx.body = `
      ${rewriteImport(
        descriptor.script.content.replace(
          "export default ",
          "const __script = "
        )
      )}
      import {render as __render} from "${url}?type=template"
      __script.render = __render
      export default __script
      `;
    } else if (query.type === "template") {
      // 解析template内容
      //
      const template = descriptor.template;
      const render = compilerDom.compile(template.content, { mode: "module" })
        .code;
      ctx.type = "application/javascript";

      ctx.body = rewriteImport(render);
    }
  } else if (url.endsWith(".css")) {
    const p = path.resolve(__dirname, url.slice(1));
    const file = fs.readFileSync(p, "utf-8");
    const content = `
      const css = "${file.replace(/\n/g, "")}"
      const link = document.createElement('style')
      link.setAttribute('type', 'text/css')
      link.innerHTML = css
      document.head.appendChild(link)
      export default css
    `;
    ctx.type = "application/javascript";
    ctx.body = content;
  }
});

// 改造.js文件内容，不是./或../开头的import，
function rewriteImport(content) {
  return content.replace(/ from ['|"]([^'"]+)['|"]/g, (s0, s1) => {
    if (s1[0] !== "." && s1[0] !== "/") {
      return ` from '/@modules/${s1}'`;
    } else {
      return s0;
    }
  });
}

app.listen(3000, () => {
  console.log("listen 3000");
});
