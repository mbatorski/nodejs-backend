import Route from "../../../lib/routes/interfaces/Route";
import Integrations from "../../services/Integrations";
import {
    normalizeUsageHeaderNames,
    validatePayloadSample,
    validateResultPath,
    validateUsageHeaderNames,
} from "../../utils/PayloadUtil";

export default new Route()
.setBody({
    name: { type: "string", minLength: 1, maxLength: 100 },
    payloadSample: {},
    resultPath: { optional: true },
    usageHeaders: { optional: true },
})
.post(async function(res, body) {
    const { name, payloadSample, resultPath, usageHeaders } = body;
    const payloadError = validatePayloadSample(payloadSample);

    if (payloadError) return res.error(400, payloadError);

    const resultPathError = validateResultPath(resultPath);

    if (resultPathError) return res.error(400, resultPathError);

    const usageHeadersError = validateUsageHeaderNames(usageHeaders);

    if (usageHeadersError) return res.error(400, usageHeadersError);

    const integration = await Integrations.create({
        name,
        payloadSample,
        resultPath: resultPath ?? null,
        usageHeaders: normalizeUsageHeaderNames(usageHeaders),
    });

    res.send(integration);
});
