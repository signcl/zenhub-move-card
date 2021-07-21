const { default: axios } = require("axios");
const core = require("@actions/core");
const { inspect } = require("util");

async function moveCardToPipeline(
  repoId,
  workspaceId,
  issueId,
  targetPipelineId
) {
  const url = `https://api.zenhub.com/p2/workspaces/${workspaceId}/repositories/${repoId}/issues/${issueId}/moves`;
  const response = await axios.post(url, {
    pipeline_id: targetPipelineId,
    position: "top"
  });
  console.log(`POST ${url} -- [${response.status}]`);
}

async function getIdOfPipelineByName(repoId, workspaceId, pipelineName) {
  const url = `https://api.zenhub.com/p2/workspaces/${workspaceId}/repositories/${repoId}/board`;
  const response = await axios.get(url);
  console.log(`GET ${url} -- [${response.status}]`);
  const pipelines = response.data.pipelines;
  const pipeline = pipelines.find(
    (pipeline) => pipeline.name.indexOf(pipelineName) !== -1
  );
  if (pipeline) {
    return pipeline.id;
  } else {
    return null;
  }
}

function extractIssueFromPattern(message) {
  let res = [
    /#(?<number>\d+)/i,
    /(?<owner>\w+)\/(?<name>issues)#(?<number>\d+)/i,
    /https?:\/\/github.com\/(?<owner>\w+)\/(?<name>\w+)\/issues\/(?<number>\d+)/i,
  ];

  for (const re of res) {
    const match = re.exec(message);
    if (match) {
      return {
        number: match.groups.number,
      };
    }
  }
}

(async function () {
  try {
    const inputs = {
      zhToken: core.getInput("zh-token"),
      zhWorkspaceId: core.getInput("zh-workspace-id"),
      zhRepoId: core.getInput("zh-repository-id"),
      commitMessage: core.getInput("commit-message"),
      pipelineId: core.getInput("zh-target-pipeline-id"),
      pipelineName: core.getInput("zh-target-pipeline-name"),
    };
    core.debug(`Inputs: ${inspect(inputs)}`);
    if (!inputs.pipelineId && !inputs.pipelineName) {
      core.setFailed(
        "one of zh-target-pipeline-id and zh-target-pipeline-name is required"
      );
      return;
    }
    let issuePattern = extractIssueFromPattern(inputs.commitMessage);
    if (!issuePattern) {
      core.info("Failed to extract issue number, action skipped");
      return;
    }
    let issueNumber = issuePattern.number;
    axios.defaults.headers.common["X-Authentication-Token"] = inputs.zhToken;
    let pipelineId;
    if (!inputs.pipelineId && inputs.pipelineName) {
      pipelineId = await getIdOfPipelineByName(
        inputs.zhRepoId,
        inputs.zhWorkspaceId,
        inputs.pipelineName
      );
      if (!pipelineId) {
        core.setFailed("No pipeline name of " + pipelineName + " found");
        return;
      }
    } else {
      pipelineId = inputs.pipelineId;
    }

    core.info(`move issue ${issueNumber} to ${pipelineId}`);

    await moveCardToPipeline(
      inputs.zhRepoId,
      inputs.zhWorkspaceId,
      issueNumber,
      pipelineId
    );
  } catch (err) {
    core.debug(inspect(err));
    core.setFailed(err.message);
  }
})();
