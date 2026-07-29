<template>
    <div class="mt-4">
        <h1 class="text-4xl bold glow mb-4">Code of Conduct and Rules</h1>
        <p class="mb-4">
            The following document establishes the rules, ethical principles, and legal terms
            governing participation in {{ WEBSITE_NAME }}. It describes the mandatory requirements
            for project submission and the standards of conduct expected of all participants.
        </p>
        <p class="mb-4">
            This page is incomplete and
            <span class="bold text-blue-400">may be revised</span>
            prior to the commencement of the hackathon. All participants bear the responsibility of
            reviewing the final version before they submit their work.
        </p>
        <div class="bg-yellow-50 border border-gray-300 rounded-lg p-4 mb-6">
            <h2 class="text-xl bold mb-2 text-gray-800">Essential Requirements at a Glance</h2>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-800">
                <li>
                    <span class="bold text-blue-400">Full source code</span>
                    must be publicly hosted on a platform such as GitHub, GitLab, Codeberg, or
                    Gitee. Executable-only uploads are
                    <span class="bold text-blue-400">not</span>
                    permitted.
                </li>
                <li>
                    A
                    <span class="bold text-blue-400">clean, professional README</span>
                    in American English is mandatory.
                </li>
                <li>
                    A
                    <span class="bold text-blue-400">publicly accessible demo URL</span>
                    and a
                    <span class="bold text-blue-400">demo video hosted on a video platform</span>
                    (e.g., YouTube, Bilibili, OneDrive) are required. Local file uploads are
                    <span class="bold text-blue-400">not</span>
                    supported.
                </li>
                <li>
                    <span class="bold text-blue-400">No login walls</span>
                    or forced third-party account creation are allowed. Any barrier to immediate
                    evaluation will incur penalties.
                </li>
                <li>
                    <span class="bold text-blue-400">Open source is at the heart of this competition.</span>
                    Closed-source projects are incompatible with our values.
                </li>
                <li>
                    <span class="bold text-blue-400">Comprehensive AI usage disclosure</span>
                    is required. Generic statements are insufficient.
                </li>
                <li>
                    <span class="bold text-blue-400">All costs are the participant's responsibility.</span>
                    Organizers shall not be held liable for any expenses incurred.
                </li>
                <li>
                    By entering, you
                    <span class="bold text-blue-400">grant a showcase license</span>
                    while retaining the freedom to choose any OSI-approved license for your code.
                </li>
            </ul>
        </div>

        <h2 class="text-3xl bold mb-2">Project Requirements</h2>
        <p class="mb-2">
            The items enumerated below are
            <span class="bold text-blue-400">required</span>
            for a valid submission.
            <span class="bold text-blue-400">
                Failure to comply with any single requirement will result in immediate
                disqualification.
            </span>
        </p>

        <ul class="mb-4">
            <li class="mb-2">
                <span class="bold text-blue-400">* Open-source repository with complete source code.</span>
                Your project must be open-source and publicly hosted on a recognized version control
                platform. Acceptable platforms include, but are not limited to,
                <ULink href="https://github.com" target="_blank">GitHub</ULink>
                ,
                <ULink href="https://about.gitlab.com" target="_blank">GitLab</ULink>
                ,
                <ULink href="https://codeberg.org" target="_blank">Codeberg</ULink>
                , and
                <ULink href="https://gitee.com" target="_blank">Gitee</ULink>
                . Any platform that permits
                <span class="bold text-blue-400">free public cloning and browsing</span>
                without authentication is acceptable. The repository
                <span class="bold text-blue-400">must</span>
                contain the
                <span class="bold text-blue-400">complete source code</span>
                of your project. Providing only a compiled executable, a compressed archive, or any
                similar opaque delivery is
                <span class="bold text-blue-400">not</span>
                acceptable and will result in disqualification.
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* README file.</span>
                Your repository must contain a file named
                <code>README.md</code>
                . This file must be written in
                <span class="bold text-blue-400">clean, professional American English</span>
                . It must include:
                <ul class="indent-[2ch] mt-1 list-disc">
                    <li>A concise description of the project.</li>
                    <li>
                        Clear instructions for using the project (a live website link, download and
                        setup steps, or both).
                    </li>
                    <li>A list of the primary technologies and frameworks employed.</li>
                    <li>A link to the demo video (see below).</li>
                </ul>
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* Public demo URL.</span>
                Your project must be
                <span class="bold text-blue-400">accessible to any person on any device</span>
                without restriction. The exact requirement varies by project type:
                <ul class="indent-[2ch] mt-1 list-disc">
                    <li class="mb-1">
                        <span class="bold text-blue-400">Websites:</span>
                        Deployed on a publicly accessible server. If authentication is required, the
                        system must allow any new user to register freely; a single demonstration
                        account is
                        <span class="bold text-blue-400">not</span>
                        acceptable.
                    </li>
                    <li class="mb-1">
                        <span class="bold text-blue-400">Desktop applications:</span>
                        Compiled into an executable for
                        <span class="bold text-blue-400">at least one</span>
                        of Windows, macOS, or Debian/Debian-based Linux. Providing executables for
                        at least two platforms is
                        <span class="bold text-blue-400">strongly encouraged</span>
                        . If you support only one platform, you must supplement the demo video with
                        a thorough, narrated walkthrough (see Video requirement below). The demo URL
                        must point to a page where the executables can be downloaded (e.g., a
                        release on your repository platform).
                    </li>
                    <li class="mb-1">
                        <span class="bold text-blue-400">Games:</span>
                        Playable directly in a web browser (for example, on
                        <ULink href="https://itch.io" target="_blank">itch.io</ULink>
                        ) or available as a downloadable executable. The demo URL must lead to the
                        playable version or to a download page.
                    </li>
                    <li>
                        <span class="bold text-blue-400">Mobile applications:</span>
                        Published in the appropriate app store or made readily available via an APK
                        (Android) or IPA (iOS) installer. The demo URL must be the app store listing
                        or a page providing the installation file.
                    </li>
                </ul>
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* Demo video.</span>
                You must submit a video
                <span class="bold text-blue-400">between one and three minutes</span>
                that demonstrates the primary features of your project. The video
                <span class="bold text-blue-400">must</span>
                be hosted on a platform that
                <span class="bold text-blue-400">does not require the viewer to log in or create an account</span>
                . Acceptable platforms include YouTube, Bilibili, OneDrive/SharePoint (with shared
                view-only links), or similar non-restrictive services.
                <span class="bold text-blue-400">Local file uploads are not supported</span>
                and will not be accepted.
                <br />
                For desktop applications that do not meet the two-platform recommendation, this
                video
                <span class="bold text-blue-400">must include narration</span>
                and a detailed walkthrough of the application's functionality.
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* Thematic relevance.</span>
                The project must engage with the hackathon theme. A minimal connection is required;
                a particularly weak connection will result in point deductions as detailed in the
                judging rubric.
            </li>
        </ul>

        <h2 class="text-3xl bold mb-2">Accessibility and Evaluation Friendliness</h2>
        <p class="mb-4">
            Our judges and community members must be able to experience your project
            <span class="bold text-blue-400">immediately, without barriers</span>
            . The following rules ensure fair and efficient evaluation:
        </p>
        <ul class="mb-4">
            <li class="mb-2">
                <span class="bold text-blue-400">* No login walls.</span>
                Your project must
                <span class="bold text-blue-400">not</span>
                require evaluators to create an account on a third-party platform solely for the
                purpose of accessing your work. This includes, but is not limited to, projects that
                require a Roblox account, a specific game client login, or any other registration
                that is not part of your own application. If your project is deployed on a platform
                that inherently requires authentication, you must
                <span class="bold text-blue-400">explicitly state this in your README</span>
                and understand that
                <span class="bold text-blue-400">
                    such a barrier will almost certainly result in significant penalties
                </span>
                .
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* No forced actions beyond common ability.</span>
                Do not require judges to install uncommon software, purchase hardware, or perform
                tasks that are unreasonable for a standard evaluation. If your project depends on
                specific peripherals or environments, you must provide a
                <span class="bold text-blue-400">fully narrated video demonstration</span>
                that captures the complete experience.
            </li>
        </ul>

        <h2 class="text-3xl bold mb-2">Maximizing Your Potential for Recognition</h2>
        <p class="mb-4">
            We expect every project to provide a
            <span class="bold text-blue-400">demo URL</span>
            and a
            <span class="bold text-blue-400">demo video</span>
            . In addition, you may submit a long-form written description (separate from the README)
            that expands on your design decisions and features. This description is
            <span class="bold text-blue-400">optional</span>
            but can strengthen your submission.
        </p>
        <p class="mb-4">
            The competition awards
            <span class="bold text-blue-400">First Prize</span>
            ,
            <span class="bold text-blue-400">Second Prize</span>
            , and
            <span class="bold text-blue-400">Third Prize</span>
            , each of which carries a guaranteed prize.
            <span class="bold text-blue-400">Honorable Mentions</span>
            may also be granted, though these are not guaranteed to include monetary awards. The
            specific monetary value of all prizes is
            <span class="bold text-blue-400">tentative</span>
            and subject to confirmation, but we are committed to providing meaningful recognition to
            the winners.
        </p>
        <ul class="mb-4">
            <li class="mb-2">
                <span class="bold text-blue-400">* Platform-agnostic projects (e.g., websites):</span>
                Providing all three elements – demo URL, demo video, and optional long-form
                description –
                <span class="bold text-blue-400">
                    significantly increases your likelihood of achieving an award or an honorable
                    mention
                </span>
                . While only the demo URL and video are mandatory, the additional description aids
                judges in understanding nuances that a video might not convey.
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">
                    * Platform-dependent projects (e.g., desktop apps, mobile apps):
                </span>
                You
                <span class="bold text-blue-400">must</span>
                provide both a demo URL (pointing to the executable or store listing) and a demo
                video. If your project is accessible on only one platform, the video becomes even
                more critical and must be comprehensive.
            </li>
        </ul>

        <h2 class="text-3xl bold mb-2">Open-Source Commitment</h2>
        <p class="mb-4">
            {{ WEBSITE_NAME }} exists to celebrate and promote
            <span class="bold text-blue-400">open-source development with love</span>
            . We hold that transparency, collaboration, and the freedom to study and modify code are
            fundamental to a healthy software community.
            <span class="bold text-blue-400">
                Closed-source projects are incompatible with the spirit of this competition.
            </span>
            We do not disparage closed-source software; rather, we choose to champion openness as
            the path to learning, innovation, and trust. Your submission must embody that value.
        </p>

        <h2 class="text-3xl bold mb-2">Participant Conduct and Originality</h2>
        <p class="mb-4">
            All participants are expected to behave in a
            <span class="bold text-blue-400">professional and respectful manner</span>
            . Harassment, discrimination, or any form of intimidation will
            <span class="bold text-blue-400">not be tolerated</span>
            . Any such behavior that surpasses an arbitrary threshold determined by the organizers
            <span class="bold text-blue-400">will be reported to the appropriate authorities</span>
            .
        </p>
        <p class="mb-4">
            Submissions must be your
            <span class="bold text-blue-400">original work</span>
            . Use of pre-existing code, libraries, or assets is permitted only if you have the legal
            right to use them and you give appropriate credit. Do not use copyrighted materials
            without a proper license.
            <span class="bold text-blue-400">
                Directly forking an existing project without meaningful modifications constitutes
                plagiarism
            </span>
            and will be addressed by the upper administration. Such cases will result in
            <span class="bold text-blue-400">immediate disqualification</span>
            .
        </p>
        <p class="mb-4">
            <span class="bold text-blue-400">
                The responsible use of artificial intelligence is not considered plagiarism
            </span>
            provided that such use is fully documented. We require detailed disclosure of all AI
            assistance (see the AI Usage Disclosure section below). However, we reserve the right to
            employ AI detection methods, either now or in the future, to identify
            <span class="bold text-blue-400">overexcessive, undeclared AI usage</span>
            or submissions that exhibit a level of genericism attributable to unchecked AI
            generation. In such cases, the organizers may classify the submission as
            <span class="bold text-blue-400">plagiarism</span>
            , resulting in disqualification.
        </p>

        <h2 class="text-3xl bold mb-2">AI Usage Disclosure</h2>
        <p class="mb-4">
            This competition is designed to help you develop real systems and project engineering
            skills. While we recognize that AI tools can be valuable aids, we require
            <span class="bold text-blue-400">full transparency</span>
            regarding their use. You must disclose
            <span class="bold text-blue-400">in detail</span>
            every component of your project that was generated or substantially assisted by an AI
            tool. A vague statement such as "AI was used in implementation" is
            <span class="bold text-blue-400">not</span>
            acceptable. Instead, describe:
        </p>
        <ul class="mb-4 list-disc list-inside">
            <li>
                <span class="bold text-blue-400">Which specific parts</span>
                (e.g., UI components, backend logic, database schemas) were AI-generated or
                AI-assisted.
            </li>
            <li>
                <span class="bold text-blue-400">The tool(s) used</span>
                (e.g., ChatGPT, GitHub Copilot, local model).
            </li>
            <li>
                <span class="bold text-blue-400">The nature of the assistance</span>
                (e.g., "prompted to generate a Python script for data parsing, then manually
                reviewed and modified").
            </li>
        </ul>
        <p class="mb-4">
            We encourage you to treat AI as a
            <span class="bold text-blue-400">learning partner</span>
            , not a black-box abstraction. Demonstrating thoughtful integration and understanding of
            AI-assisted code is viewed positively; over-reliance without comprehension is not.
        </p>

        <h2 class="text-3xl bold mb-2">Principles of Open Participation</h2>
        <p class="mb-2">
            By participating in {{ WEBSITE_NAME }}, you affirm your commitment to the following
            principles, which constitute the
            <span class="bold text-blue-400">ethical foundation</span>
            of your submission.
        </p>
        <ul class="mb-4 list-none">
            <li class="mb-2">
                * Build with the intent to
                <span class="bold text-blue-400">create benefit and utility</span>
                , not to cause harm or disruption.
            </li>
            <li class="mb-2">
                * Share your work
                <span class="bold text-blue-400">openly and freely</span>
                , enriching the wider community.
            </li>
            <li class="mb-2">
                * Grant others the
                <span class="bold text-blue-400">same freedoms</span>
                you have received, never restricting access to knowledge or tools beyond what is
                ethically necessary.
            </li>
            <li>
                * Act with
                <span class="bold text-blue-400">integrity</span>
                , taking responsibility for your work and respecting the contributions of others.
            </li>
        </ul>

        <h2 class="text-3xl bold mb-2">License and Showcase Permission</h2>
        <p class="mb-4">
            By submitting a project to {{ WEBSITE_NAME }}, you confirm that you have read and agree
            to the following terms:
        </p>
        <ul class="mb-4">
            <li class="mb-2">
                <span class="bold text-blue-400">
                    * Automatic MIT license for source code (if no other license specified).
                </span>
                We
                <span class="bold text-blue-400">strongly encourage</span>
                you to include an explicit open-source license file (for example,
                <code>LICENSE</code>
                or
                <code>LICENSE.md</code>
                ) in your repository. If your repository does
                <span class="bold text-blue-400">not</span>
                contain such a file at the time of submission, you agree that the source code of
                your project is automatically made available under the terms of the
                <ULink href="https://opensource.org/licenses/MIT" target="_blank">
                    MIT License
                </ULink>
                . If you include a valid license file that specifies another OSI-approved license
                (for example, GPL, Apache-2.0, BSD), that license will govern your code, and we will
                <span class="bold text-blue-400">fully respect your choice</span>
                . This automatic licensing provision exists solely to guarantee that the community
                can freely study and use your work in the absence of an explicit license.
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* Grant of license for showcase.</span>
                You hereby grant the organizers a
                <span class="bold text-blue-400">
                    non-exclusive, worldwide, royalty-free, perpetual, irrevocable, and
                    sublicensable license
                </span>
                to use, reproduce, modify, adapt, publish, translate, create derivative works from,
                distribute, and publicly display your submitted project, in whole or in part, in any
                medium, for the limited purpose of advertising, promoting, and showcasing the
                hackathon and its results. This license is
                <span class="bold text-blue-400">independent</span>
                of the source-code license you choose and does not restrict your rights to continue
                distributing your project under that license.
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* Representations and warranties.</span>
                You represent and warrant that you are the sole owner of all rights in the submitted
                project or that you have obtained all necessary permissions and licenses to grant
                the rights described herein, and that the project does not violate the rights of any
                third party or any applicable law.
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* No obligation to use.</span>
                The organizers are under
                <span class="bold text-blue-400">no obligation</span>
                to exercise the rights granted above.
            </li>
            <li class="mb-2">
                <span class="bold text-blue-400">* Withdrawal of showcase consent.</span>
                If you prefer that your project not be showcased, you must contact the organizers
                with a
                <span class="bold text-blue-400">legitimate reason</span>
                at least
                <span class="bold text-blue-400">24 hours before the competition submission deadline</span>
                . In such a case, your submission will be
                <span class="bold text-blue-400">disqualified</span>
                . If you withdraw your consent without meeting this requirement, the license granted
                above shall remain in full force and effect.
            </li>
            <li>
                <span class="bold text-blue-400">* Waiver of compensation.</span>
                You agree that you will receive
                <span class="bold text-blue-400">no compensation</span>
                , beyond any prizes explicitly awarded by the hackathon, in connection with the use
                of your project as described above.
            </li>
        </ul>

        <h2 class="text-3xl bold mb-2">Disclaimer of Liability and General Provisions</h2>
        <p class="mb-4">
            <span class="bold text-blue-400">Financial responsibility.</span>
            The organizers of {{ WEBSITE_NAME }} shall
            <span class="bold text-blue-400">not</span>
            be held liable for any costs, damages, or expenses incurred by participants in relation
            to the competition. This includes, but is not limited to, fees for third-party services,
            cloud computing resources, AI tool subscriptions, hardware purchases, or any other
            expenditure. Any potential reimbursement of offline-event costs by the organizers is
            <span class="bold text-blue-400">purely tentative and not guaranteed</span>
            . Participants assume full responsibility for all such costs.
        </p>
        <p class="mb-4">
            <span class="bold text-blue-400">Limitation of liability.</span>
            In no event shall the organizers be liable for any direct, indirect, incidental,
            special, or consequential damages arising out of participation in the hackathon,
            including but not limited to loss of data, profit, or business opportunity. The
            organizers provide no warranties, express or implied, regarding the competition, the
            judging process, or the prizes. All submissions are made at the participant's own risk.
        </p>
        <p class="mb-4">
            <span class="bold text-blue-400">Right to modify.</span>
            The organizers reserve the right to modify, suspend, or cancel the competition at any
            time for any reason, and to amend these rules with reasonable notice. The interpretation
            of all rules is at the sole discretion of the organizers, whose decisions are
            <span class="bold text-blue-400">final and binding</span>
            . If any provision of these rules is found to be unenforceable, the remaining provisions
            shall remain in full effect.
        </p>
        <p class="mb-4">
            <span class="bold text-blue-400">Contact for clarification.</span>
            Should you require clarification on any of these rules, please direct your inquiries via
            electronic mail to
            <span class="bold text-blue-400">devclub-bisz@basischina.com</span>
            . This address will be answered by members of the BISZ Developers' Club leadership.
        </p>

        <div class="mt-4 text-center">
            <blockquote
                class="italic text-gray-700 border-l-4 border-gray-300 pl-4 inline-block text-left"
            >
                <p class="mb-1">May thy labor bring a harvest sweet,</p>
                <p class="mb-1">And wisdom's light thy eager mind shall greet;</p>
                <p class="mb-1">In open fellowship thy craft shall shine,</p>
                <p>A lasting gift to all—thy work divine.</p>
            </blockquote>
        </div>
    </div>
</template>
