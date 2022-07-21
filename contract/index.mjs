import {loadStdlib, ask} from '@reach-sh/stdlib';
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

  const isDeployer = await ask.ask(`Are you deploying the contract?`,ask.yesno);

  if (isDeployer) {
    const acc = await createAccount('Alice');
    // const maxAddr = parseInt(await ask.ask(`How many addresses may be added to the whitelist?`));

    console.log('Alice is Deploying the contract...');
    const ctcDeployer = await acc.contract(backend);

    await Promise.all([
      backend.Deployer(ctcDeployer, {
        notifyDeployed: async () => {
          const ctcInfoD = JSON.stringify(await ctcDeployer.getInfo());
          console.log(`Alice is ready to accept attachers...`);
          console.log(`The contract has deployed as: ${ctcInfoD}`);
        },
        seeAttachment: (addr) => {
          console.log(`Alice sees address ${stdlib.formatAddress(addr)} has attached to the contract.`);
        },
        seeAttachmentFail: (addr) => {
          console.log(`Alice sees that ${stdlib.formatAddress(addr)} tried but was unable to join the contract.`);
        }
      }),
    ]);

  }
  else {
    const ctcInfoA = await ask.ask(`Enter the contract string:`,JSON.parse);

    const createBob = async (who) => {
      const acc = await createAccount(who);
      console.log('');

      console.log(`${who} is joining the contract...`);
      const ctcAttacher = acc.contract(backend, ctcInfoA);
  
      // read view of current attachers array
      const attArray = await ctcAttacher.v.seeAttachers();
      if (attArray[0] === 'Some') {
        console.log(`${who} uses a View to see the current Attachers:`);
        for(let i in attArray[1]) {
          console.log(' '+(parseInt(i)+1)+': '+stdlib.formatAddress(attArray[1][i]));
        }
      }
      else {
        console.log(`${who} sees that there is not anyone attached yet.`);
      }
  
      // request to attach
      console.log(`${who} is sending an API Request to attach to contract...`);
      const didAttach = await ctcAttacher.a.UserAPI.attach();
  
      if (!didAttach) {
        console.log(`${who} is unable to attach to the contract. It has reached the maximum number of attachers.`);
        process.exit();
      }
      else {
        console.log(`${who} has successfully attached to the contract.`);
      }
    }

    await createBob('Bob1');
    await createBob('Bob2');
    await createBob('Bob3');
    await createBob('Bob4');
    await createBob('Bob5');
    await createBob('Bob6');

  }

  process.exit();
})();
