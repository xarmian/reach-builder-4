import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib();

(async () => {
  const getBalance = async (who) => stdlib.formatCurrency(await stdlib.balanceOf(who), 4);

  const createAccount = async (who) => {
    const startingBalance = stdlib.parseCurrency(100);
  
    const acc = await stdlib.newTestAccount(startingBalance);
    const addr = stdlib.formatAddress(acc.getAddress());
    
    console.log(`A new account (${who}) has been generated with ${await getBalance(acc)} tokens and address ${addr}`);
    return acc;
  }

  const createBob = async (who,ctcInfo) => {
    const acc = await createAccount(who);
    console.log(`${who} is joining the contract...`);
    const ctcAttacher = acc.contract(backend, ctcInfo);

    Promise.all([
      backend.Attachers(ctcAttacher, {
        notifyDeployed: async () => {
          console.log('');

          const deployerAddress = stdlib.formatAddress((await ctcAttacher.v.seeDeployerAddress())[1]);
          console.log(`${who} sees that ${deployerAddress} deployed the contract`);
      
          // read view of current attachers array
          const attArray = await ctcAttacher.v.seeAttachers();
          if (attArray[0] === 'Some') {
            console.log(`${who} uses a View to see the current Attachers:`);
      
            let cnt = 0;
            for(let i in attArray[1]) {
              const addr = stdlib.formatAddress(attArray[1][i]);
              if (addr === deployerAddress) continue; // skip if it's the deployer's address
      
              cnt++;
              console.log(' '+cnt+': '+addr);
            }
      
            if (cnt === 0) {
              console.log(`${who} sees that no one has attached yet.`);
            }
          }
      
          // request to attach
          console.log(`${who} is doing an API Request to attach to the contract...`);
          const didAttach = await ctcAttacher.a.UserAPI.attach();
      
          if (!didAttach) {
            console.log(`${who} is unable to attach to the contract. It has reached the maximum number of attachers.`);
          }
          else {
            console.log(`${who} has successfully attached to the contract.`);
          }

          return Promise.resolve();
        },
      }),
    ]);
  }

  // ============= Program Output Begins ==============

  const acc = await createAccount('Alice');
  console.log('Alice is Deploying the contract...');
  const ctc = await acc.contract(backend);

  await Promise.all([
    backend.Deployer(ctc, {
      notifyDeployed: async () => {
        const ctcInfo = await ctc.getInfo();
        console.log(`Alice is ready to accept attachers...`);
        console.log(`The contract has deployed as: ${JSON.stringify(ctcInfo)}`);
        console.log('');

        for(let i = 1; i <= 6; i++) {
          await createBob(`Bob${i}`,ctcInfo);
        }
      },
      seeAttachment: (addr) => {
        console.log(`Alice sees address ${stdlib.formatAddress(addr)} has attached to the contract.`);
      },
      seeAttachmentFail: (addr) => {
        console.log(`Alice sees that ${stdlib.formatAddress(addr)} tried but was unable to join the contract.`);
      }
    }),
  ]);

  process.exit();
})();
