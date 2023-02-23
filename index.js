const Alexa = require("ask-sdk");
const doc = require("dynamodb-doc");
const dynamo = new doc.DynamoDB();

const tableName = "biscuitDatabase";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(handlerInput) {
    const speechText = "Who wants biscuits?";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard("I am the biscuit bot!", speechText)
      .getResponse();
  },
};

const addToList = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "addToList"
    );
  },
  async handle(handlerInput) {
    const person =
      handlerInput.requestEnvelope.request.intent.slots.personName.value;

    const sessionAttributes =
      handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.person = person;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    var params = {
      TableName: tableName,
      Item: {
        personName: person,
        purchased: 0,
        favourite: "",
      },
      ConditionExpression: "attribute_not_exists(personName)",
    };

    try {
      let response = await dynamo.putItem(params).promise();
      console.log("response from putItem received");
      console.log(response);
    } catch (err) {
      console.log("error: ", err);
    }

    const speechText = `${person} was added to the biscuit list. What is their favourite biscuit?`;
    const repromptText = "Can you repeat that please.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard("The biscuit list got longer:", speechText)
      .getResponse();
  },
};

const addFavourite = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "addFavourite"
    );
  },
  async handle(handlerInput) {
    let person;
    if (handlerInput.requestEnvelope.request.intent.slots.personName) {
      person =
        handlerInput.requestEnvelope.request.intent.slots.personName.value;
    } else {
      const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();
      person = sessionAttributes.person;
    }

    const biscuit =
      handlerInput.requestEnvelope.request.intent.slots.biscuit.value;

    var params = {
      TableName: tableName,
      Key: {
        personName: person,
      },
      UpdateExpression: "set favourite = :newFavourite",
      ExpressionAttributeValues: {
        ":newFavourite": biscuit,
      },
    };

    try {
      let response = await dynamo.updateItem(params).promise();
      console.log("response from update received");
      console.log(response);
    } catch (err) {
      console.log("error: ", err);
    }

    const speechText = `${person}'s favourite biscuit has been set to ${biscuit}`;
    const repromptText = "Can you repeat that please.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard("Who buy da biscuits?", speechText)
      .getResponse();
  },
};

const addPurchase = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "addPurchase"
    );
  },
  async handle(handlerInput) {
    const person =
      handlerInput.requestEnvelope.request.intent.slots.personName.value;

    var params = {
      TableName: tableName,
      Key: {
        personName: person,
      },
      UpdateExpression: "set purchased = purchased + :val",
      ExpressionAttributeValues: {
        ":val": 1,
      },
    };

    try {
      let response = await dynamo.updateItem(params).promise();
      console.log("response from update received");
      console.log(response);
    } catch (err) {
      console.log("error: ", err);
    }

    const speechText = `${person}'s biscuit tally has been updated.`;
    const repromptText = "Can you repeat that please.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard("Biscuits bought!", speechText)
      .getResponse();
  },
};

const turnToBuy = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "turnToBuy"
    );
  },
  async handle(handlerInput) {
    var params = {
      TableName: tableName,
      ProjectionExpression: "personName, purchased",
    };

    var result = await dynamo.scan(params).promise();
    let data = Object.values(result);

    let sortedData = data[0].sort((a, b) => {
      return a.purchased - b.purchased;
    });

    console.log(sortedData);

    const person = sortedData[0].personName;

    const speechText = `It's ${person} turn`;
    const repromptText = "Can you repeat that please.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard("Who buy da biscuits?", speechText)
      .getResponse();
  },
};

const favouriteBiscuit = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "favouriteBiscuit"
    );
  },

  async handle(handlerInput) {
    const person =
      handlerInput.requestEnvelope.request.intent.slots.personName.value;

    var params = {
      Key: {
        personName: person,
      },
      TableName: tableName,
    };

    var result = await dynamo.getItem(params).promise();
    let data = Object.values(result);
    let output = await data[0].favourite;

    const speechText = `${output} is ${person}'s favourite biscuit.`;
    const repromptText = "Can you repeat that please.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard("Yummy!", speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const speechText = "Ask me about biscuits!";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard("Help", speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name ===
        "AMAZON.CancelIntent" ||
        handlerInput.requestEnvelope.request.intent.name ===
          "AMAZON.StopIntent")
    );
  },
  handle(handlerInput) {
    const speechText = "Dipping out so soon?";

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard("Bye bye.", speechText)
      .withShouldEndSession(true)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    //any cleanup logic goes here
    //e.g. deleting any database entires lying around
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`); // log to CloudWatch console

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  },
};

let skill;

exports.handler = async function (event, context) {
  console.log(`REQUEST++++${JSON.stringify(event)}`); // log to CloudWatch console
  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        LaunchRequestHandler,
        addToList,
        turnToBuy,
        favouriteBiscuit,
        addPurchase,
        addFavourite,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
      )
      .addErrorHandlers(ErrorHandler)
      .create();
  }

  const response = await skill.invoke(event, context);
  console.log(`RESPONSE++++${JSON.stringify(response)}`); // log to CloudWatch console

  return response;
};
