import '@testing-library/jest-dom';

if (typeof global.Request === 'undefined') {
  global.Request = class Request {} as any;
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {} as any;
}
if (!global.Response.json) {
  global.Response.json = function(data: any, init?: any) {
    return new Response(JSON.stringify(data), init);
  } as any;
}
