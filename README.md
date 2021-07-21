# Move Zenhub Card to Specific Pipeline

A GitHub action to move a issue to specific pipeline in zenhub.

This is designed to trigger to move issue in zenhub to a pipeline, **usually it is used to move a comment 
message mentioned issue to a "In Progress" pipeline**.

## Usage

```yml
      - name: Sync issue status
        uses: signcl/zenhub-move-card@master
        with:
            zh-token: ${{ secrets.ZENHUB_TOKEN }}
            commit-message: ${{ github.event.commits[0].message }}
            zh-workspace-id: "5f61ee0800dcfe2a1f69838e"
            zh-target-pipeline-name: "In Progress"
            zh-repository-id: "296001634"
```

The `commit-message` should contain a mentioned issue. The format can be:

1. `#{issueNumber}` 
2. `{githubOwner}/{githubRepo}#{issueNumber}` 
3. `https://github.com/{githubOwner}/{githubRepo}/issues/{issueNumber}`.

If no issue pattern found in commit message, this action will be skipped.

### Action inputs

| Name | Description |
| --- | --- |
| `zh-token` | (**required**) `ZENHUB TOKEN` See [zenhub authentication](https://github.com/ZenHubIO/API#authentication) for more information. | |
| `zh-repository-id` | (**required**) The ID of the repository, not its full name. See [zenhub repoId](https://github.com/ZenHubIO/API#notes-1) |
| `zh-workspace-id` | (**required**) The ID of the ZenHub Workspace. |
| `commit-message` | (**required**) The commit message of current commit. Usually use `${{ github.event.commits[0].message }}`. If no issue number is parsed from the message, this action will be skipped. |
| `zh-target-pipeline-id` | The ID of workspace pipeline to move issue to. |
| `zh-target-pipeline-name` | The name of workspace pipeline to move issue to. |

One of `zh-target-pipeline-id` or `zh-target-pipeline-name` should be given.

## License

MIT License - see the [LICENSE](LICENSE) file for details