const { default: axios } = require('axios');
const core = require('@actions/core');
const { inspect } = require('util');

async function moveCardToPipeline(
  repoId,
  workspaceId,
  issueId,
  targetPipelineId
) {
  const url = `https://api.zenhub.com/p2/workspaces/${workspaceId}/repositories/${repoId}/issues/${issueId}/moves`;
  const response = await axios.post(url, {
    pipeline_id: targetPipelineId,
    position: 'top',
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
    core.setFailed('No pipeline name of ' + pipelineName + ' found');
    return;
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
    if (match.groups.number) {
      return match.groups.number;
    }
    core.info('Failed to extract issue number, action skipped');
    return;
  }
}

function getPipelineId(inputs) {
  let pipelineId;
  if (!inputs.pipelineId && inputs.pipelineName) {
    pipelineId = await getIdOfPipelineByName(
      inputs.zhRepoId,
      inputs.zhWorkspaceId,
      inputs.pipelineName
    );
  } else {
    pipelineId = inputs.pipelineId;
  }
  return pipelineId;
}

function getIssuesFromPR(inputs) {
  const API_URL = 'https://api.github.com/graphql';
  const query = `query getIssueNumbers($url: URI!){
    resource(url: $url) {
      ... on PullRequest {
        closingIssuesReferences(first: 10) {
          nodes {
            number
          }
        }
      }
    }
  }`;

  try {
    const data = await axios.post(
      API_URL,
      {
        query,
        variables: {
          url: inputs.prUrl,
        },
      },
      {
        headers: {
          Authorization: 'Bearer ' + inputs.githubToken,
          'Content-Type': 'application/json',
        },
      }
    );
    const issueNodes = data.resource.closingIssueReferences.nodes;
    const issueNumbers = issueNodes.map((issueNode) => issueNode.number);
    core.info(`data-${issueNumbers}`);
    return issueNumbers;
  } catch (e) {
    core.setFailed(`Failed to get linked issues: ${e.message}`);
    return;
  }
}

(async function () {
  try {
    const inputs = {
      zhToken: core.getInput('zh-token'),
      zhWorkspaceId: core.getInput('zh-workspace-id'),
      zhRepoId: core.getInput('zh-repository-id'),
      prUrl: core.getInput('pr-url'),
      pipelineId: core.getInput('zh-target-pipeline-id'),
      pipelineName: core.getInput('zh-target-pipeline-name'),
      githubToken: core.getInput('github-token')
    };
    core.debug(`Inputs: ${inspect(inputs)}`);
    if (!inputs.pipelineId && !inputs.pipelineName) {
      core.setFailed(
        'one of zh-target-pipeline-id and zh-target-pipeline-name is required'
      );
      return;
    }
    const issues = getIssuesFromPR(inputs);
    const issueNumbers = issues.map((issue) => extractIssueFromPattern(issue));
    axios.defaults.headers.common['X-Authentication-Token'] = inputs.zhToken;
    const pipelineId = getPipelineId(inputs);

    core.info(`move issues ${issueNumbers.join(', ')} to ${pipelineId}`);

    issueNumbers(
      (issueNumber) =>
        await moveCardToPipeline(
          inputs.zhRepoId,
          inputs.zhWorkspaceId,
          issueNumber,
          pipelineId
        )
    );
  } catch (err) {
    core.debug(inspect(err));
    core.setFailed(err.message);
  }
})();
