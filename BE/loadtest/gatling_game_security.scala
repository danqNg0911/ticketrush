import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class GameSecuritySimulation extends Simulation {

  private val baseUrl = sys.env.getOrElse("BASE_URL", "http://localhost:8000/api")
  private val token = sys.env.getOrElse("TOKEN", "")

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .authorizationHeader(s"Bearer $token")

  private val signFeeder = Iterator.continually(Map(
    "eventId" -> "1",
    "gameType" -> "wheel"
  ))

  private val replayAndTamperScenario = scenario("Replay-Tamper-Bypass")
    .feed(signFeeder)
    .exec(
      http("sign")
        .get("/game/sign?event_id=${eventId}&game_type=${gameType}")
        .check(status.is(200))
        .check(jsonPath("$.nonce").saveAs("nonce"))
        .check(jsonPath("$.timestamp").saveAs("timestamp"))
        .check(jsonPath("$.signed_payload").saveAs("signature"))
    )
    .exec(
      http("play-legit")
        .post("/game/play")
        .body(StringBody("""{"event_id":${eventId},"game_type":"${gameType}","nonce":"${nonce}","timestamp":${timestamp},"signed_payload":"${signature}"}"""))
        .check(status.in(200, 403, 429))
    )
    .pause(50.milliseconds)
    .exec(
      http("play-replay")
        .post("/game/play")
        .body(StringBody("""{"event_id":${eventId},"game_type":"${gameType}","nonce":"${nonce}","timestamp":${timestamp},"signed_payload":"${signature}"}"""))
        .check(status.in(400, 403, 429))
    )
    .exec(
      http("play-tamper")
        .post("/game/play")
        .body(StringBody("""{"event_id":${eventId},"game_type":"${gameType}","nonce":"${nonce}","timestamp":${timestamp},"signed_payload":"tampered-signature"}"""))
        .check(status.is(400))
    )

  setUp(
    replayAndTamperScenario.inject(rampUsers(120).during(90.seconds))
  ).protocols(httpProtocol)
}
