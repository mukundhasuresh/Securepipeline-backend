const { scanRepo } = require("./githubController");

exports.githubWebhook = async (req, res) => {
  try {
    console.log("GitHub Webhook received");

    // Log full payload for debugging
    console.log("Payload:", JSON.stringify(req.body, null, 2));

    // GitHub sends different events like ping, push etc.
    const event = req.headers["x-github-event"];
    console.log("Event type:", event);

    // Handle ping event
    if (event === "ping") {
      console.log("Ping event received");
      return res.status(200).send("Ping OK");
    }

    // Handle push event safely
    if (event === "push") {
      if (!req.body.repository) {
        console.log("No repository data");
        return res.status(200).send("No repo info");
      }

      const repo = req.body.repository.name;
      console.log("Webhook triggered for repo:", repo);

      // TODO: later we map repo → user and trigger scan
      // await scanRepo(repo);

      return res.status(200).send("Push event received");
    }

    // Handle other events
    res.status(200).send("Event ignored");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
};