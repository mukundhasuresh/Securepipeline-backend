const { scanRepo } = require("./githubController");

exports.githubWebhook = async (req, res) => {
  try {
    console.log("GitHub Webhook received");

    // Get event type safely
    const event = req.headers["x-github-event"] || "unknown";
    console.log("Event type:", event);

    // Always log minimal payload (avoid huge logs in production)
    if (req.body?.repository?.name) {
      console.log("Repository:", req.body.repository.name);
    }

    // Handle ping event (GitHub verification)
    if (event === "ping") {
      console.log("Webhook verified by GitHub");
      return res.status(200).send("Ping OK");
    }

    // Handle push event
    if (event === "push") {
      const repo = req.body?.repository?.name;

      if (!repo) {
        console.log("Push event but no repository found");
        return res.status(200).send("No repository info");
      }

      console.log("Push detected for repo:", repo);

      // Future: auto scan
      // await scanRepo(repo);

      return res.status(200).send("Push received");
    }

    // Ignore other GitHub events
    console.log("Ignored event:", event);
    return res.status(200).send("Event ignored");
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).send("Handled error safely");
  }
};