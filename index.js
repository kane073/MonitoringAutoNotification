/**
 * Created by kanealasco on 26/08/2018.
 */
const express = require('express');
//import express from 'express';
const bodyParser = require('body-parser');
//import bodyParser from 'body-parser';
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const { PubSub } = require('graphql-subscriptions');

const cors = require('cors');
const { execute, subscribe } = require('graphql');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');

const notifications = [];
const pubsub = new PubSub();
const NOTIFICATION_SUBSCRIPTION_TOPIC = 'newNotifications';

const typeDefs = `
	type Query { 
	    notifications: [Notification] 
	}
	type Person {
        id: Int!
        firstName: String
        lastName: String
        email: String
    }
	type Notification { 
		label: String
		typeNotification: String
		author: Person
		destinateur: Person
		recepteur: Person
		
	}
	type Mutation { 
	    pushNotification(label: String!): Notification 
	}
	type Subscription { 
	    newNotification: Notification 
	}
`;

const resolvers = {
    Query : { notifications: () => notifications },
    Mutation: {
      pushNotification: (root, args) => {
        const newNotification = { label: args.label };
        notifications.push(newNotification);

        pubsub.publish(NOTIFICATION_SUBSCRIPTION_TOPIC, { newNotification: newNotification });
        return newNotification;
      },
  },
  Subscription: {
    newNotification: {
      subscribe: () => pubsub.asyncIterator(NOTIFICATION_SUBSCRIPTION_TOPIC)
    }
  },
};



const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();

// Set up a whitelist and check against it:
/*var whitelist = ['http://localhost:3000', 'http://dev.notification.monitoringauto.fr', 'http//localhost:4000/graphiql']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}*/

// Then pass them to cors:
//app.use(cors(corsOptions));

/*app.use(
	'*', 
	//cors({ origin: `http://localhost:3000` }),
	//cors({ origin: `http://dev.notification.monitoringauto.fr`})
	cors()); 
	// allows request from webapp
	*/
app.use(cors());

app.use(
	'/graphql', 
	bodyParser.json(), 
	graphqlExpress({ schema })
	);

app.use(
	'/graphiql', 
	graphiqlExpress({ 
		endpointURL: '/graphql',
		subscriptionsEndpoint: `ws://localhost:4000/subscriptions`
		})
	);

const ws = createServer(app);

ws.listen(4000, () => {
  console.log('Go to http://localhost:4000/graphiql to run queries!');

  new SubscriptionServer({
    execute,
    subscribe,
    schema
  }, {
    server: ws,
    path: '/subscriptions',
  });
});


