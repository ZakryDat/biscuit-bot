const Alexa = require("ask-sdk");
const doc = require("dynamodb-doc");
const dynamo = new doc.DynamoDB();

const openAIKey = process.env.OPENAI_API_KEY;
console.log(openAIKey);

const tableName = "biscuitDatabase";

async function openAICall(promptName, promptBiscuit) {
  let prompt = `Write a funny and creative limerick about ${promptName}'s favourite biscuit: ${promptBiscuit}.`;

  const url = "https://api.openai.com/v1/completions";
  const params = {
    model: "text-davinci-003",
    prompt: prompt,
    temperature: 0.7,
    max_tokens: 200,
    frequency_penalty: 1.0,
  };
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${openAIKey}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      headers: headers,
    });
    const responseJson = await response.json();
    //output = `${prompt}${response.choices[0].text}`;
    return responseJson.choices[0].text;
  } catch (err) {
    console.log(err);
  }
}

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

    var params = {
      TableName: tableName,
      Item: {
        personName: person,
        purchased: 0,
        favourite: "",
      },
      ConditionExpression: "attribute_not_exists(personName)",
    };

    let speechText;
    try {
      let response = await dynamo.putItem(params).promise();
      console.log(response);
      speechText = `${person} was added to the biscuit list. What is their favourite biscuit?`;
    } catch (err) {
      console.log("error: ", err);
      speechText = `${person} is already in the biscuit list.`;
    }

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
    const person =
      handlerInput.requestEnvelope.request.intent.slots.personName.value;

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

    const speechText = `It's ${person}'s turn`;
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

const jaffaCakes = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "jaffaCakes"
    );
  },

  async handle(handlerInput) {
    const speechText =
      "McVities classify jaffa cakes as cake. In 1991 they had to defend this classification in court when the department for customs and excise ruled that jaffa cakes were biscuits partly covered in chocolate, so that McVities would have to pay V.A.T. on jaffa cakes. McVities appealed the decision and the court ruled in their favour. Jaffa cakes are therefore legally cakes, not biscuits. Now, don't mention Jaffa cakes to me ever again, or else.";
    const repromptText = "Can you repeat that please.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard("Warning!", speechText)
      .getResponse();
  },
};

const biscuitPoem = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "biscuitPoem"
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
    const favourite = await data[0].favourite;

    const response = await openAICall(person, favourite);
    console.log(response);

    const speechText = response;
    const repromptText = "Can you repeat that please.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard("Warning!", speechText)
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
        jaffaCakes,
        biscuitPoem,
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
