type NodeRef = { type: 'joint'; jointId: string; };
type PinRef = { type: 'pin'; pinId: string; };
type Target = NodeRef | PinRef;
const conns: { target: Target }[] = [];
const i = 0;
const hitJointId = "1";
const p1 = conns[i].target.type === 'joint' && conns[i].target.jointId === hitJointId;
