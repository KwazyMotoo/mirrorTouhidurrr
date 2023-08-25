const fileRegex = /^\/((index\.html|robots\.txt|LICENSE)|((js|images).+))?$/;

import { encodeProtocol } from './encode.js'; // Import the encoding functions

async function handleRequest(req, env) {
  const { host: originalHost, pathname: originalPath } = new URL(req.url);
  /**
 * Handles the incoming request.
 *
 * @param {Request} req - The incoming request object.
 * @param {object} env - The environment object.
 * @returns {Promise<Response>} The response object promise.
 */


  if (fileRegex.test(originalPath)) return env.ASSETS.fetch(req);

  const { url, host, path } = (() => {
    let slices = originalPath.split("/");
    while (!slices[0] || slices[0] == originalHost) slices.shift();
    const path = slices.join("/");
    return {
      path,
      host: slices.shift(),
      url: "https://" + path,
    };
  })();

  if (host.length < 3)
    return new Response("Request too Short!", { status: 404 });

  await fetch("https://web.archive.org/save/" + url);

  var reqObj = {
    headers: req.headers,
    method: req.method,
    redirect: "follow",
  };

  if (req.cf) reqObj.cf = req.cf;
  if (req.body) reqObj.body = req.body;

  var data = await fetch(url, reqObj);

  // Encode the URL in the response body
  const encodedUrl = encodeProtocol(url); // Use the encodeProtocol function
  const encodedData = await data.text().then(txt => txt.replace(url, encodedUrl));

  try {
    var ct = await data.headers.get("content-type");
    var b = ct.includes("html") || ct.includes("javascript");
    b &&= !(
      ct.includes("stylesheet") ||
      ct.includes("css") ||
      ct.includes("image")
    );
  } catch (e) {
    console.log(e);
  }

  if (b) {
    function absolute(rel) {
      let st = path.split("/");
      let arr = rel.split("/");
      st.pop();
      for (let i = 0, l = arr.length; i < l; i++) {
        if (!arr[i] || arr[i] == ".") continue;
        if (arr[i] == "..") st.pop();
        else st.push(arr[i]);
      }
      return st.join("/");
    }

    await data
      .text()
      .then((txt) => {
        var hostEnd = host.split(".").slice(-2).join(".");
        // handles some rare cases
        txt = txt.replace(
          /(?<=(href|src)=)(?!https?:\/\/)[^ :">]+(?=>)/g,
          (m) => {
            let hashPart = "";
            const hashIndex = m.indexOf("#");
            if (hashIndex > -1) {
              m = m.slice(0, hashIndex);
              hashPart = m.slice(hashIndex);
            }
            return `/${host}/${absolute(m)}${hashPart}`;
          }
        );
        txt = txt.replace(
          /(?<=(href|src)=")(?!https?:\/\/)[^:"]+/g,
          (m) => {
            let hashPart = "";
            const hashIndex = m.indexOf("#");
            if (hashIndex > -1) {
              m = m.slice(0, hashIndex);
              hashPart = m.slice(hashIndex);
            }
            return `/${host}/${absolute(m)}${hashPart}`;
          }
        );
        txt = txt.replace(/https?:\/\/(\w(\.|-|))+/g, (m) => {
          if (m.includes(hostEnd)) {
            if (m.includes("\\/")) return "\\/";
          }
          return m
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");
        });
        data = new
        Response(txt, data); }) .catch((e) => console.log(e)); }

        // Modify the response headers data.headers.set("cache-control", "no-store"); data.headers.set("x-robots-tag", "noindex, nofollow");
        
        return data; }
        
        export default { fetch: handleRequest };
      
