export interface Backlog {
 userAcceptance?:{backend:boolean};
 gates:Record<string,{status:string;verification:string}>;
 tasks:{id:string;status:string;verification:string;dependencies:string[]}[];
}
export function checkGate(backlog:Backlog,gateId?:string):string[];
