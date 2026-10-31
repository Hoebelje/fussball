/* Verschlüsselung im Browser: PBKDF2 (SHA-256) + AES-GCM. Das Passwort verlässt den Browser nie für die Entschlüsselung. */
const KaderCrypto=(()=>{
  const enc=new TextEncoder(),dec=new TextDecoder(),IT=200000;
  const b64=u=>{let s="";u.forEach(c=>s+=String.fromCharCode(c));return btoa(s)};
  const key=async(pw,salt)=>{
    const base=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:IT,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  };
  return{
    async verschluesseln(obj,pw){
      const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
      const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(pw,salt),enc.encode(JSON.stringify(obj)));
      return{v:1,it:IT,salt:b64(salt),iv:b64(iv),ct:b64(new Uint8Array(ct))};
    },
    async entschluesseln(p,pw){
      const f=s=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0));
      const buf=await crypto.subtle.decrypt({name:"AES-GCM",iv:f(p.iv)},await key(pw,f(p.salt)),f(p.ct));
      return JSON.parse(dec.decode(buf));
    }
  };
})();
