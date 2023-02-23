//! # A Concordium V1 smart contract
use concordium_std::*;
use core::fmt::Debug;
use serde_json;
use serde::{Serialize, Deserialize};

#[derive(Serial, Deserial, SchemaType, Clone)]
pub struct State {
    model: String,
    dataset: String,
    avg_acc: String,
    ver_cnt: i32,
    json_value: String
}

#[derive(Debug, PartialEq, Eq, Reject, Serial, Deserial, SchemaType)]
enum Error {
    #[from(concordium_std::ParseError)]
    ParseParamsError,
}

#[derive(Serial, Deserial, SchemaType, Clone)]
pub struct InitSchema {
    model: String,
    dataset: String,
}

#[derive(serde::Serialize, serde::Deserialize, SchemaType, Clone)]
pub struct RecvSchema {
    avg_acc: f32,
    json_value: serde_json::Value
}

#[init(contract = "my_contract", parameter = "InitSchema")]
fn init<S: HasStateApi>(
    _ctx: &impl HasInitContext,
    _state_builder: &mut StateBuilder<S>,
) -> InitResult<State> {
    let param: InitSchema = _ctx.parameter_cursor().get()?;
    let i_state = State {model: String::from(param.model), 
                     dataset: String::from(param.dataset),
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
    mutable,
    payable
)]
fn receive<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    _host: &mut impl HasHost<State, StateApiType = S>,
    _amount: Amount
) -> Result<(), Error> {
    

    let throw_error = ctx.parameter_cursor().get()?; // Returns Error::ParseError on failure
    if throw_error {
        Err(Error::ParseParamsError)
    } else {
        Ok(())
    }
}

#[receive(contract = "my_contract", name = "view", return_value = "State")]
fn view<'b, S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &'b impl HasHost<State, StateApiType = S>,
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
