'reach 0.1';
'use strict';

/* eslint-disable */
const myFromMaybe = (m) => fromMaybe(m, (() => false), ((x) => x));
const MAXATTACHERS = 5;

export const main = Reach.App(() => {

  setOptions({ connectors: [ ALGO ], untrustworthyMaps: true });
  
  const Deployer = Participant('Deployer', {
    notifyDeployed: Fun([], Null),
    seeAttachment: Fun([Address], Null),
    seeAttachmentFail: Fun([Address], Null),
  });
  
  const UserAPI = API('UserAPI', {
    attach: Fun([], Bool),
  });

  const AdminAPI = API('AdminAPI', {
    endContract: Fun([], Bool), // exit parallelReduce and end contract
  });

  const V = View({
    seeAttachers: Array(Address,MAXATTACHERS),
    seeDeployerAddress: Address,
  });

  init();

  Deployer.publish();
  commit();

  Deployer.only(() => {
    interact.notifyDeployed();
  });
  Deployer.publish();

  V.seeDeployerAddress.set(Deployer);
  const initialAttachers = Array.replicate(MAXATTACHERS, Deployer);
  
  const [ done, numAttached, attachers ] = parallelReduce([ false, 0, initialAttachers ])
      .define(() => { 
        V.seeAttachers.set(attachers); 
      })
      .invariant(numAttached <= MAXATTACHERS)
      .while(!done)
      .api(
        UserAPI.attach,
        () => {},
        () => 0,
        (returnFunc) => {
          const canAttach = (numAttached < MAXATTACHERS && !(fromMaybe(attachers.indexOf(this), (() => false), ((_) => true)))) ? true : false;
          returnFunc(canAttach);
          if (canAttach) {
            Deployer.interact.seeAttachment(this);
          }
          else {
            Deployer.interact.seeAttachmentFail(this);
          }
          const doIncrement = (canAttach) ? 1 : 0;
          const newAttachers = (canAttach) ? attachers.set(numAttached, this) : attachers;
          
          return [ done, numAttached + doIncrement, newAttachers ];
        }
      )
      .api(
        AdminAPI.endContract,
        () => {
          assume(this == Deployer);
        },
        () => 0,
        (returnFunc) => {
          require(this == Deployer);
          returnFunc(true);

          return [ true, numAttached, attachers ];
        }
      );

  transfer(balance()).to(Deployer);
  commit();

  exit();
});
