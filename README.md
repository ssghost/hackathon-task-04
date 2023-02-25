# My Model Weights Storage Dapp For Task 04

## Introduction
This is an experimental Dapp on the CCD testnet with two functional parts, the contract part (as in folder "my-contract") is written in Rust with CCD-std library, the frontend part (as in folder "my-app") is wrtten in React Typescript with CCD-SDKs.

The main capability of this Dapp is to let the contract owner to store his pretrained machine learning model's weights (as uploaded Json file) into the contract and easily update those weights with new versions of better accuracy performances. However,
other users can also view the basic information of the stored weights, but must pay a specified amount of CCD tokens to get access
of the current stored weights.

## Usage For Owner
As an owner of this contract, you must firstly deploy and init this contract with the CLI tool `cargo concordium`and `concordium-client`, like below:

```
$cd my-contract && \
  cargo concordium build --out ./my_contract.wasm.v1 && \
  concordium-client module deploy my_contract.wasm.v1 --sender your_account_name && \ 
  concordium-client contract init \
         your_contract_reference_hash \
         --contract my_contract \
         --energy 10000 \
         --parameter-json my_parameter.json
```

Notice when you are initializing the contract you should afford a Json file with a format like below:

`{ "model": "your_model_name", "dataset": "your_dataset_name"}`

After all is done, now you can deploy the frontend app with npm:

`$cd ../my-app && npm start`

Then, go to your browser, you will see a webpage with two buttons named "Refresh" and "Update", the "Refresh" button is for retrieving the current stored weights and displaying them on the nearby textarea block, intially it has no content; the "Update"
button lets you to update your weights into the contract, all you need is to click it and follow the prompt. After updated your weights, you can click "Refresh" button again, you`ll see your uploaded content and its basic information on the nearby textarea block.

## Usage For Pay-Viewer
As a pay-viewer, you don't need to deploy the contract, but you must have a browser wallet with enough CCD tokens in it. 

Go to your browser and enter the URL of the deployed frontend app, you will see a slightly different webpage compared with which the owner can see, there also have two buttons on the page, but named "Refresh" and "Pay to View", you click "Refresh", you can only retrieve and display the basic information of current stored weights rather than the whole content of the weights. If you want to see the whole content, you must click "Pay to View" and this will automatically connect to you browser wallet and make a 
payment of some specified amount of CCD tokens, then you can see the content of current stored weights on the textarea block nearby.

## Notice
This Dapp is made for the Concordium Hackathon task 04 and due to time constraint I didn't make a video-clip to explain it, but I 
believe this README file is detailed enough for your comprehension. And I believe this Dapp is capable of performing various tests.    