<script setup lang="ts">
useHead({
    title: `Contributing | ${WEBSITE_NAME}`,
});
</script>

<template>
    <div class="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <h1 class="text-4xl font-bold">Contributing to basishacks</h1>

        <section class="space-y-4">
            <h2 class="text-2xl font-semibold">Welcome</h2>
            <p>
                Thank you for your interest in contributing to basishacks, the official platform for
                the BIBS-C Network Hackathon. This document outlines the expectations and processes
                for anyone wishing to contribute code, report issues, or otherwise help improve the
                project.
            </p>
        </section>

        <section class="space-y-4">
            <h2 class="text-2xl font-semibold">Commit Guidelines</h2>
            <p>
                All contributions are made via pull requests to the
                <ULink
                    to="https://www.github.com/basishacks/basishacks-r2"
                    target="_blank"
                    class="text-primary underline"
                >
                    basishacks-r2 repository
                </ULink>
                . Please follow these guidelines when preparing your changes:
            </p>
            <ul class="list-disc list-inside space-y-2">
                <li>
                    <span class="font-semibold">
                        You are recommended (not required to, but we would greatly appreciate)
                        conventional commits.
                    </span>
                    Prefix your commit messages with a type such as
                    <code>feat</code>
                    ,
                    <code>fix</code>
                    ,
                    <code>docs</code>
                    ,
                    <code>test</code>
                    ,
                    <code>refactor</code>
                    ,
                    <code>chore</code>
                    , or
                    <code>style</code>
                    . Follow this format:
                    <code>type(scope): description</code>
                    .
                </li>
                <li>
                    <span class="font-semibold">Keep changes focused.</span>
                    Each commit should represent a single logical change. Avoid bundling unrelated
                    modifications in the same commit.
                </li>
                <li>
                    <span class="font-semibold">Write meaningful descriptions.</span>
                    The body of the commit message should explain
                    <em>why</em>
                    the change was made, not just
                    <em>what</em>
                    was changed.
                </li>
                <li>
                    <span class="font-semibold">Run the test suite.</span>
                    Execute
                    <code>bun run test</code>
                    and confirm all tests pass before submitting your pull request. Also run
                    <code>bun run format</code>
                    to ensure code style compliance.
                </li>
                <li>
                    <span class="font-semibold">Do not commit secrets.</span>
                    Never commit API keys, tokens, passwords, or other sensitive credentials. All
                    secrets must be loaded from environment variables.
                </li>
                <li>
                    <span class="font-semibold">Rebase onto main.</span>
                    Before opening a pull request, rebase your branch onto the latest
                    <code>main</code>
                    and resolve any conflicts.
                </li>
            </ul>
        </section>

        <section class="space-y-4">
            <h2 class="text-2xl font-semibold">Reporting Security Issues</h2>
            <p>
                If you discover a security vulnerability or any other issue that could affect the
                integrity of the platform or its users, please disclose it privately. Do
                <span class="font-semibold">not</span>
                file a public GitHub issue or discuss it in public forums. If you have disclosed the issue publically, you are considered complicit in using the exploit if there is someone else who used this exploit later on. We encourage you, if you have the ability and willingness to, to attempt to fix the issue yourself by forking the repository, implementing your fix and commiting, and creating a pull request (we will review it and decide whether to merge it as soon as possible) to be merged into main. We encourage you to obfuscate the fix (and hence the issue) by adding in other boilerplate code and not mentioning it explicitely in the pull request, as pull requests are publically visible.
            </p>
            <p>
                To report a security concern, send an email or a Teams message to the BIBS-C Developers' Club at
                <span class="font-mono text-primary">devclub-bisz@basischina.com</span>
                . Include a detailed description of the issue, steps to reproduce it, and any
                relevant supporting material.
            </p>
            <p>
                We will acknowledge receipt within 48 hours and work to address the issue as quickly
                as possible. Depending on the severity and impact of the report, we may offer a
                discretionary reward, though no guarantee of compensation is made in advance. If you consent or refuse in your letter that you want to be publically mentioned or thanked after the hackathon season is over for your report, we will respect your choice.
            </p>
        </section>

        <section class="space-y-4">
            <h2 class="text-2xl font-semibold">Responsible Disclosure</h2>
            <p>
                We ask that you act in good faith and refrain from exploiting any vulnerability you
                discover. Unauthorized access, data exfiltration, service disruption, or any other
                malicious activity will not be tolerated.
            </p>
            <p>
                We maintain full logging and audit trails across the platform. In the event that an
                individual is found to have exploited a vulnerability rather than reporting it, we
                will pursue all available remedies, which may include reporting the incident to
                school administration or further on if the issue is severe. We have the
                capability to identify and trace such activity, and we will hold accountable anyone
                who chooses to abuse rather than assist.
            </p>
        </section>

        <section class="space-y-4">
            <h2 class="text-2xl font-semibold">Code of Conduct</h2>
            <p>
                All contributors are expected to adhere to the principles of respect, integrity, and
                collaboration. Harassment, discrimination, or any form of unprofessional behavior
                will not be permitted. By participating in this project, you agree to uphold these
                standards.
            </p>
        </section>

        <USeparator />

        <p class="text-sm text-ui-text-muted">
            basishacks is maintained by the BISZ Developers' Club et al. as part of the BIBS-C Network
            Hackathon.
        </p>
    </div>
</template>
