import {loadStdlib, ask} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib();

const getBalance = async (who) => stdlib.formatCurrency(await stdlib.balanceOf(who), 4);

const createAccount = async (who) => {
  const startingBalance = stdlib.parseCurrency(100);

  const acc = await stdlib.newTestAccount(startingBalance);
  const addr = stdlib.formatAddress(acc.getAddress());
  
  console.log(`A new account (${who}) has been generated with ${await getBalance(acc)} tokens and address ${addr}`);
  return acc;
}

const interactive = (async () => {
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
      console.log('');

      const acc = await createAccount(who);
      console.log(`${who} is joining the contract...`);
      const ctcAttacher = acc.contract(backend, ctcInfoA);
  
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
        process.exit();
      }
      else {
        console.log(`${who} has successfully attached to the contract.`);
      }
    }

    for(let i = 1; i <= 6; i++) {
      await createBob(`Bob${i}`);
    }

  }

  process.exit();
});

const noninteractive = (async () => {
  const createBob = async (who,ctcInfo) => {
    console.log('');
    const acc = await createAccount(who);

    console.log(`${who} is joining the contract...`);
    const ctcAttacher = acc.contract(backend, ctcInfo);

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
});

const doInteractive = await ask.ask('Do you want to run in Interactive Mode?',ask.yesno);
if (doInteractive) {
  console.log('');
  console.log('Running in interactive mode...');
  console.log('');
  interactive();
}
else {
  console.log('');
  console.log('Running in non-interactive mode...');
  console.log('');
  noninteractive();
}