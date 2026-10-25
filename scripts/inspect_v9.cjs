const fs = require('fs');
const html = fs.readFileSync('C:/Users/Yash Gaurav/.gemini/antigravity/brain/543423fd-f502-4f26-80e6-b8aaddce013f/.user_uploaded/media_1792887360160_1c8ee930.html', 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>', styleStart);
const style = html.slice(styleStart + 7, styleEnd);
console.log('Style length:', style.length);

const landingStart = html.indexOf('<div id="landing">');
const scriptTag = html.indexOf('<script src="https://cdnjs.cloudflare.com');
const htmlBody = html.slice(landingStart, scriptTag);
console.log('HTML body length:', htmlBody.length);

const jsStart = html.indexOf('<script>\n\'use strict\';', scriptTag);
const jsEnd = html.lastIndexOf('</script>');
const jsCode = html.slice(jsStart + '<script>\n'.length, jsEnd);
console.log('JS length:', jsCode.length);
