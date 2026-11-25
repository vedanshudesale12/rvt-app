import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    door: { executor: "constant-arrival-rate", rate: 20, timeUnit: "1s", duration: "30s", preAllocatedVUs: 40 },
  },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500"] },
};

export default function doorRush() {
  const response = http.get(`${__ENV.BASE_URL || "http://127.0.0.1:3000"}/api/health`);
  check(response, { "200": (row) => row.status === 200 });
  sleep(0.01);
}
