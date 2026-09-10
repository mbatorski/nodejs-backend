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
    id: { type: "number" },
    name: { type: "string", minLength: 1, maxLength: 100, optional: true },
    payloadSample: { optional: true },
    resultPath: { optional: true },
    usageHeaders: { optional: true },
})
.put(async function(res, body) {
    const { id, name, payloadSample, resultPath, usageHeaders } = body;

    if (!Integrations.has(id)) return res.error(404, "Integration not found");

    if (payloadSample !== undefined) {
        const payloadError = validatePayloadSample(payloadSample);

        if (payloadError) return res.error(400, payloadError);
    }

    const resultPathError = validateResultPath(resultPath);

    if (resultPathError) return res.error(400, resultPathError);

    const usageHeadersError = validateUsageHeaderNames(usageHeaders);

    if (usageHeadersError) return res.error(400, usageHeadersError);

    const integration = await Integrations.edit(id, {
        name,
        payloadSample,
        resultPath,
        usageHeaders: usageHeaders === undefined ? undefined : normalizeUsageHeaderNames(usageHeaders),
    });

    res.send(integration);
});
