/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 75:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 788:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ }),

/***/ 837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const { default: axios } = __nccwpck_require__(788);
const core = __nccwpck_require__(75);
const { inspect } = __nccwpck_require__(837);

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

async function getPipelineId(inputs) {
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

 async function getIssuesFromPR(inputs) {
  const API_URL = 'https://api.github.com/graphql';
  const query = `query getIssueNumbers($url: URI!){
    resource(url: $url) {
      ... on PullRequest {
        closingIssuesReferences(first: 10) {
          nodes {
            number
            repository {
              id
            }
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
    core.info(`data-${issueNodes}`);
    return issueNodes;
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
      prUrl: core.getInput('pr-url'),
      pipelineId: core.getInput('zh-target-pipeline-id'),
      pipelineName: core.getInput('zh-target-pipeline-name'),
      githubToken: core.getInput('github-token'),
    };
    core.debug(`Inputs: ${inspect(inputs)}`);
    if (!inputs.pipelineId && !inputs.pipelineName) {
      core.setFailed(
        'one of zh-target-pipeline-id and zh-target-pipeline-name is required'
      );
      return;
    }
    const issues = await getIssuesFromPR(inputs);
    core.info(`Issues- ${issues}`)
    axios.defaults.headers.common['X-Authentication-Token'] = inputs.zhToken;
    const pipelineId = await getPipelineId(inputs);

    issues.forEach(async (issue) => {
      await moveCardToPipeline(
        issue.repository.id,
        inputs.zhWorkspaceId,
        issue.number,
        pipelineId
      );
      core.info(`move issue ${issue.number} in ${issue.repo} to ${pipelineId}`);
    });
  } catch (err) {
    core.debug(inspect(err));
    core.setFailed(err.message);
  }
})();

})();

module.exports = __webpack_exports__;
/******/ })()
;