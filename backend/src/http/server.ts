import fastify from "fastify";
import cors from '@fastify/cors'

import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { createTrip } from "./routes/create-trip";
import { confirmTrip } from "./routes/confirm-trip";
import { confirmParticipant } from "./routes/confirm-participant";
import { createActivity } from "./routes/create-activity";
import { getActivities } from "./routes/get-acitivities";
import { createLink } from "./routes/create-link";
import { getLinks } from "./routes/get-links";
import { getParticipants } from "./routes/get-participants";
import { createInvite } from "./routes/create-invite";
import { updateTrip } from "./routes/update-trip";
import { getTripDetails } from "./routes/get-trip-details";
import { getParticipant } from "./routes/get-participant";
import { errorHandler } from "./error-handler";
import { env } from "../env";

const app = fastify()

app.register(cors,{
    origin: '*',
})

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler(errorHandler)

app.register(getTripDetails)
app.register(getParticipants)
app.register(getParticipant)
app.register(getActivities)
app.register(getLinks)

app.register(createTrip)
app.register(createActivity)
app.register(createLink)
app.register(createInvite)

app.register(updateTrip)

app.register(confirmTrip)
app.register(confirmParticipant)

app
    .listen({
        host:'0.0.0.0',
        port: env.PORT 
    })
    .then(() => {
    console.log(`HTTP server running! (http://localhost:3333/docs)`)
})