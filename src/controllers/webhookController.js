const { scanRepo } = require("./githubController");

exports.githubWebhook = async (req, res) => {
  try {
    const repo = req.body.repository.name;

    // We will later map repo → user
    // For now just log

    console.log("Webhook triggered for repo:", repo);

    // TODO: trigger scan automatically

    res.status(200).send("Webhook received");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};