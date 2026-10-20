interface ExtensionSender {id?:string;url?:string;origin?:string}
declare const chrome:{
 storage:{local:{get(key:string):Promise<Record<string,unknown>>;set(value:Record<string,unknown>):Promise<void>}};
 runtime:{id:string;onMessage:{addListener(listener:(message:unknown,sender:ExtensionSender,respond:(response:unknown)=>void)=>boolean):void};sendMessage(message:unknown):Promise<unknown>};
};
