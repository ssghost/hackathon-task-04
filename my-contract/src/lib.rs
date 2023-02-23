//! # A Concordium V1 smart contract
use concordium_std::*;
use core::fmt::Debug;
use std::default::Default;
use serde_json;

#[derive(Serial, Deserial, SchemaType, Clone)]
pub struct State {
    model: String,
    dataset: String,
    amount: Amount,
    avg_acc: String,
    ver_cnt: u8,
    json_value: String
}

#[derive(Serial, Deserial, SchemaType, Clone)]
pub struct ViewFree {
    model: String,
    dataset: String,
    amount: Amount,
    avg_acc: String,
    ver_cnt: u8
}

#[derive(Debug, PartialEq, Eq, Default, Reject, Serial, Deserial, SchemaType)]
enum Error {
    #[from(concordium_std::ParseError)]
    ParseParamsError,
    #[default] Default
}

#[derive(Serial, Deserial, SchemaType, Clone)]
pub struct InitSchema {
    model: String,
    dataset: String,
}

#[derive(Serial, Deserial, SchemaType, Clone)]
pub struct RecvSchema {
    amount: Amount,
    avg_acc: String,
    json_value: String
}

#[init(contract = "my_contract", parameter = "InitSchema")]
fn init<S: HasStateApi>(
    _ctx: &impl HasInitContext,
    _state_builder: &mut StateBuilder<S>,
) -> InitResult<State> {
    let param: InitSchema = _ctx.parameter_cursor().get()?;
    let i_state:State = State {model: String::from(param.model), 
                     dataset: String::from(param.dataset),
                     amount: Amount{micro_ccd:0},
                     avg_acc: (0.0).to_string(),
                     ver_cnt: 0,
                     json_value: serde_json::json!(null).to_string()};               
    Ok(i_state)
}

#[receive(
    contract = "my_contract",
    name = "receive",
    parameter = "RecvSchema",
    error = "Error",
    mutable
)]
fn receive<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    _host: &mut impl HasHost<State, StateApiType = S>,
) -> Result<(), Error> {
    let owner: AccountAddress = ctx.owner();
    let sender: Address = ctx.sender();
    ensure!(sender.matches_account(&owner));
    let param: RecvSchema = ctx.parameter_cursor().get()?;
    let state: &mut State = _host.state_mut();
    ensure!((param.avg_acc.parse::<f32>()).unwrap() >= ((state.avg_acc).parse::<f32>()).unwrap());
    state.amount = param.amount;
    state.avg_acc = String::from(param.avg_acc);
    state.ver_cnt += 1;
    state.json_value = param.json_value;
    let throw_error: bool = ctx.parameter_cursor().get()?; 
    if throw_error {
        Err(Error::ParseParamsError)
    } else {
        Ok(())
    }
}

#[receive(contract = "my_contract", name = "view_owner", return_value = "State")]
fn view_owner<'b, S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &'b impl HasHost<State, StateApiType = S>,
) -> ReceiveResult<&'b State> {
    let owner: AccountAddress = _ctx.owner();
    let sender: Address = _ctx.sender();
    ensure!(sender.matches_account(&owner));
    Ok(host.state())
}

#[receive(contract = "my_contract", name = "view_free", return_value = "ViewFree")]
fn view_free<'b, S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &'b impl HasHost<State, StateApiType = S>,
) -> ReceiveResult<ViewFree> {
    Ok(ViewFree { model: String::from(&*host.state().model), 
        dataset: String::from(&*host.state().dataset), 
        amount: host.state().amount, 
        avg_acc: String::from(&*host.state().avg_acc), 
        ver_cnt: host.state().ver_cnt 
    })
}

#[receive(contract = "my_contract", name = "view_payer", return_value = "State", payable)]
fn view_payer<'b, S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &'b impl HasHost<State, StateApiType = S>,
    _amount: Amount
) -> ReceiveResult<&'b State> {

    Ok(host.state())
}

#[concordium_cfg_test]
mod tests {
    use super::*;
    use test_infrastructure::*;

    type ContractResult<A> = Result<A, Error>;

    #[concordium_test]
    fn test_init() {
        let ctx = TestInitContext::empty();

        let mut state_builder = TestStateBuilder::new();

        let state_result = init(&ctx, &mut state_builder);
        state_result.expect_report("Contract initialization results in error");
    }

    #[concordium_test]
    fn test_throw_no_error() {
        let ctx = TestInitContext::empty();

        let mut state_builder = TestStateBuilder::new();

        let initial_state = init(&ctx, &mut state_builder).expect("Initialization should pass");

        let mut ctx = TestReceiveContext::empty();

        let throw_error = false;
        let parameter_bytes = to_bytes(&throw_error);
        ctx.set_parameter(&parameter_bytes);

        let mut host = TestHost::new(initial_state, state_builder);

        let result: ContractResult<()> = receive(&ctx, &mut host);

        claim!(result.is_ok(), "Results in rejection");
    }

    #[concordium_test]
    fn test_throw_error() {
        let ctx = TestInitContext::empty();

        let mut state_builder = TestStateBuilder::new();

        let initial_state = init(&ctx, &mut state_builder).expect("Initialization should pass");

        let mut ctx = TestReceiveContext::empty();

        let throw_error = true;
        let parameter_bytes = to_bytes(&throw_error);
        ctx.set_parameter(&parameter_bytes);

        let mut host = TestHost::new(initial_state, state_builder);

        let error: ContractResult<()> = receive(&ctx, &mut host);

        claim_eq!(error, Err(Error::ParseParamsError), "Function should throw an error.");
    }
}
